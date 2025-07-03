/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const waitForDomStability = async (
  iframe: HTMLIFrameElement,
  idleFor = 4000,
  timeout = 90000
): Promise<void> => {
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
};

export const waitForIdle = async (iframe: HTMLIFrameElement, timeout = 90000): Promise<void> => {
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
};

export const waitForNoLoadingCharts = async (
  iframe: HTMLIFrameElement,
  timeout = 90000,
  stableFor = 4000
): Promise<void> => {
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
};

export const waitForSelector = async (
  iframe: HTMLIFrameElement,
  selector: string,
  timeout = 90000
): Promise<HTMLElement | null> => {
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
};

export const getSelectorForUrl = (url: string) => {
  if (url.includes('/app/discover')) return '.kbnAppWrapper';
  if (url.includes('/app/dashboards')) return '.kbnAppWrapper';
  if (url.includes('/app/r')) return '.kbnAppWrapper';
  return 'main';
};

export const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('failed to generate blob'));
        return;
      }
      resolve(blob);
    }, type);
  });
};
