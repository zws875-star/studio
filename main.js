// ZWS Studio - Main JavaScript
// Data loading, Lightbox, Video Modal, Dark Mode, Interactions

// ─── Data Loading ───────────────────────────────────────────

async function loadJSON(path) {
  const timestamp = Date.now();
  const localUrl = path.includes('?') ? `${path}&t=${timestamp}` : `${path}?t=${timestamp}`;

  // Prefer the deployed copy so content and uploaded files come from one release.
  try {
    const res = await fetch(localUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.list || []);
    }
  } catch(e) {
    console.warn('[loadJSON] local failed', e.message);
  }

  // Raw GitHub remains a fallback while a new deployment is still propagating.
  const repoPath = path.replace(/^\//, '');
  const rawUrl = `https://raw.githubusercontent.com/zws875-star/studio/main/${repoPath}?t=${timestamp}`;

  try {
    const res = await fetch(rawUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const result = Array.isArray(data) ? data : (data?.list || []);
      console.log('[loadJSON] success from raw', result.length, 'items');
      return result;
    }
  } catch(e) {
    console.warn('[loadJSON] raw failed', e.message);
  }

  console.warn('[loadJSON] all failed for', path);
  return [];
}

function assetUrl(value) {
  if (!value) return '';
  const match = value.match(/^https:\/\/raw\.githubusercontent\.com\/zws875-star\/studio\/main\/(.+)$/i);
  return match ? '/' + match[1] : value;
}

function brandLogoMarkup(filterId) {
  return `
    <svg viewBox="0 0 64 48" role="presentation" focusable="false" aria-hidden="true">
      <defs>
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="1" seed="8" result="noise">
            <animate attributeName="baseFrequency" dur="7s" values="0.012 0.05;0.018 0.07;0.012 0.05" repeatCount="indefinite"></animate>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
        </filter>
      </defs>
      <rect class="brand-frame" x="8" y="6" width="48" height="36"></rect>
      <g filter="url(#${filterId})">
        <path class="brand-grey shadow" d="M16 12H40L20 31H48"></path>
        <path class="brand-grey" d="M14 10H38L18 29H46"></path>
        <path class="brand-orange" d="M12 10H42L16 32H52"></path>
        <path class="brand-orange" d="M14 10L24 10"></path>
        <path class="brand-orange" d="M16 32L52 32"></path>
      </g>
    </svg>
  `;
}

function initBrandLogos() {
  document.querySelectorAll('[data-brand-logo]').forEach((slot, index) => {
    slot.innerHTML = brandLogoMarkup(`brand-distort-${index}`);
  });
}

function videoUrl(item) {
  return assetUrl(item?.actionUrl || item?.mediaUrl || item?.embed || item?.url || '');
}

// ─── Dark Mode ──────────────────────────────────────────────

function initDarkMode() {
  document.documentElement.classList.add('dark');
  localStorage.setItem('zws-theme', 'dark');
}

// ─── Lightbox ──────────────────────────────────────────────

let currentLightboxIndex = 0;
let currentPhotoList = [];

function initLightbox() {
  if (document.getElementById('lightbox')) return;

  const lightboxHTML = `
    <div id="lightbox">
      <div id="lightbox-close">&times;</div>
      <img id="lightbox-image" alt="">
      <div id="lightbox-counter" class="absolute bottom-[90px] left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-widest"></div>
      <div class="lightbox-controls">
        <button class="lightbox-btn" id="lightbox-prev">&larr;</button>
        <button class="lightbox-btn" id="lightbox-next">&rarr;</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', lightboxHTML);

  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const img = document.getElementById('lightbox-image');
  const counter = document.getElementById('lightbox-counter');

  closeBtn.onclick = () => lightbox.classList.remove('active');
  lightbox.onclick = (e) => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  };

  prevBtn.onclick = () => navigateLightbox(-1);
  nextBtn.onclick = () => navigateLightbox(1);

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') lightbox.classList.remove('active');
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function navigateLightbox(direction) {
  currentLightboxIndex = (currentLightboxIndex + direction + currentPhotoList.length) % currentPhotoList.length;
  const img = document.getElementById('lightbox-image');
  const counter = document.getElementById('lightbox-counter');
  img.src = currentPhotoList[currentLightboxIndex];
  if (counter) counter.textContent = `${currentLightboxIndex + 1} / ${currentPhotoList.length}`;
}

function openLightbox(images, startIndex = 0) {
  currentPhotoList = images;
  currentLightboxIndex = startIndex;

  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-image');
  const counter = document.getElementById('lightbox-counter');

  img.src = currentPhotoList[currentLightboxIndex];
  if (counter) counter.textContent = `${currentLightboxIndex + 1} / ${currentPhotoList.length}`;
  lightbox.classList.add('active');
}

function makePhotosClickable(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const photos = Array.from(container.querySelectorAll('.photo-item'));
  const imageUrls = photos.map(item => item.dataset?.url || item.querySelector('img')?.src).filter(Boolean);

  photos.forEach((item, index) => {
    item.style.cursor = 'zoom-in';
    item.onclick = () => { openLightbox(imageUrls, index); };
  });
}

// ─── Video Modal ────────────────────────────────────────────

function openVideoModal(embedUrl, title = '') {
  embedUrl = assetUrl(embedUrl);
  const existing = document.querySelector('.video-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'video-modal active';

  let embedHTML = '';
  if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(embedUrl);
    embedHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
  } else if (embedUrl.includes('vimeo.com')) {
    const videoId = embedUrl.split('/').pop();
    embedHTML = `<iframe src="https://player.vimeo.com/video/${videoId}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
  } else {
    embedHTML = `<video controls autoplay><source src="${embedUrl}" type="video/mp4"></video>`;
  }

  modal.innerHTML = `
    <div class="video-modal-content">
      <div class="flex justify-between items-center mb-4 px-1">
        <div class="text-white/90 text-lg font-medium">${title}</div>
        <button class="text-white/60 hover:text-white text-3xl transition-colors cursor-pointer">&times;</button>
      </div>
      ${embedHTML}
    </div>
  `;

  document.body.appendChild(modal);

  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.querySelector('button').onclick = () => modal.remove();

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', handler); }
  }, { once: true });
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// ─── Page Transitions ────────────────────────────────────────

function initPageTransition() {
  document.querySelectorAll('a[href]:not([target])').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('javascript')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = href;
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.15s ease';
        setTimeout(() => { window.location.href = target; }, 150);
      });
    }
  });
}

// ─── Scroll Reveal ───────────────────────────────────────────

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Smooth Image Load ──────────────────────────────────────
// Only applies to images within content containers to avoid breaking nav/thumbnails

function initSmoothImages() {
  document.querySelectorAll('.photo-grid img, #featured-works img, #video-grid img, .blog-card img').forEach(img => {
    img.classList.add('fade-in');
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
    }
  });
}

// ─── Initialize ──────────────────────────────────────────────

function initSite() {
  initBrandLogos();
  initLightbox();
  initDarkMode();
  initPageTransition();
  initScrollReveal();
  initSmoothImages();
  document.documentElement.style.scrollBehavior = 'smooth';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}

// ─── Global Exports ─────────────────────────────────────────

window.ZWS = {
  openLightbox,
  openVideoModal,
  makePhotosClickable,
  loadJSON,
  assetUrl,
  videoUrl,
  brandLogoMarkup
};
