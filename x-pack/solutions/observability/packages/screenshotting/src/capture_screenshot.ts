/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import html2canvas from 'html2canvas';
import { CaptureOptions } from './types';

function waitForDomStability(
  iframe: HTMLIFrameElement,
  idleFor = 4000,
  timeout = 90000
): Promise<void> {
  return new Promise((resolve) => {
    const doc = iframe.contentDocument;
    if (!doc) return resolve();

    let lastChange = Date.now();
    const observer = new MutationObserver(() => {
      lastChange = Date.now();
    });

    observer.observe(doc.body, { childList: true, subtree: true });

    const interval = setInterval(() => {
      if (Date.now() - lastChange > idleFor) {
        clearInterval(interval);
        observer.disconnect();
        resolve();
      }
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

function waitForIdle(iframe: HTMLIFrameElement, timeout = 90000): Promise<void> {
  return new Promise((resolve) => {
    const win = iframe.contentWindow;

    if (!win) {
      // iframe has no contentWindow
      return resolve();
    }

    const idleCallback = (win as any).requestIdleCallback;

    if (typeof idleCallback === 'function') {
      idleCallback(() => resolve(), { timeout });
      setTimeout(() => resolve(), timeout + 500);
    } else {
      // requestIdleCallback not supported
      setTimeout(() => resolve(), timeout);
    }
  });
}

async function waitForNoLoadingCharts(
  iframe: HTMLIFrameElement,
  timeout = 90000,
  stableFor = 4000
): Promise<void> {
  const start = Date.now();
  let lastChange = Date.now();

  return new Promise((resolve) => {
    const poll = () => {
      const doc = iframe.contentDocument;
      if (!doc) return resolve();

      const hasLoadingCharts = Array.from(doc.querySelectorAll('[class],[id]')).some((element) => {
        const id = element.id?.toLowerCase();
        const className = element.className?.toString().toLowerCase();
        return id?.includes('loadingchart') || className?.includes('loadingchart');
      });

      if (hasLoadingCharts) {
        lastChange = Date.now();
      }

      if (Date.now() - lastChange > stableFor) {
        return resolve();
      }

      if (Date.now() - start > timeout) {
        // timeout: elements did not finish loading
        return resolve();
      }

      setTimeout(poll, 300);
    };

    poll();
  });
}

async function waitForSelector(
  iframe: HTMLIFrameElement,
  selector: string,
  timeout = 90000
): Promise<HTMLElement | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const element = iframe.contentDocument?.querySelector(selector);

      if (element) {
        resolve(element as HTMLElement);
      } else if (Date.now() - start < timeout) {
        setTimeout(check, 300);
      } else {
        // timeout waiting for elements to load
        resolve(null);
      }
    };
    setTimeout(check, 300);
  });
}

const getSelectorForUrl = (url: string) => {
  if (url.includes('/app/discover')) return '.kbnAppWrapper';
  if (url.includes('/app/dashboards')) return '.kbnAppWrapper';
  if (url.includes('/app/r')) return '.kbnAppWrapper';
  return 'main';
};

const waitForFocus = (): Promise<void> => {
  return new Promise((resolve) => {
    if (document.hasFocus()) {
      resolve();
    } else {
      const onFocus = () => {
        window.removeEventListener('focus', onFocus);
        resolve();
      };
      window.addEventListener('focus', onFocus);
    }
  });
};

export async function captureScreenshot(
  url: string,
  options: CaptureOptions = {}
): Promise<string | null> {
  const { timeout = 90000, idleFor = 4000, stableFor = 4000 } = options;

  const iframe = document.createElement('iframe');

  Object.assign(iframe.style, {
    position: 'absolute',
    width: '1200px',
    height: '600px',
    pointerEvents: 'none',
    visibility: 'hidden',
  });

  document.body.appendChild(iframe);

  return new Promise((resolve) => {
    const selector = getSelectorForUrl(url);

    iframe.onload = async () => {
      const element = await waitForSelector(iframe, selector, timeout);
      if (!element) {
        cleanup();
        return resolve(null);
      }

      await waitForDomStability(iframe, idleFor, timeout);
      await waitForIdle(iframe, timeout);
      await waitForNoLoadingCharts(iframe, timeout, stableFor);
      // await waitForFocus();

      try {
        const canvas = await html2canvas(element);
        const image = canvas.toDataURL('image/png');
        cleanup();
        resolve(image);
      } catch (err) {
        // html2canvas failed
        cleanup();
        resolve(null);
      }
    };

    iframe.src = url;

    const cleanup = () => {
      document.body.removeChild(iframe);
    };
  });
}
