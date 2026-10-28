// 鋼筋錨錠查表：離線快取
// 第一次開啟時把整個 App 存到手機，之後沒有網路也能開；有網路時在背景更新，下次開啟就是新版
// 同一個網域下有多個 App，快取名稱帶 App 代號，清舊版時只清自己的
const APP = 'hp5';
const VERSION = 'bb6b158e8a';
const CACHE = APP + '-' + VERSION;
const FONT_CACHE = 'shared-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(APP + '-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google 字型：快取優先（字型檔不會變）
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      c.put(req, res.clone());
      return res;
    }))).catch(() => new Response('', { status: 504 })));
    return;
  }

  // App 本身：先用快取立即顯示，同時在背景向網路更新
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => hit || c.match('./index.html'));
      return hit || net;
    })));
  }
});
