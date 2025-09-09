/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const waitForNoGlobalLoadingIndicator = async (
  doc: Document | null,
  timeout: number,
  stableFor: number
): Promise<void> => {
  const start = Date.now();
  let lastChange = Date.now();

  return new Promise((resolve) => {
    const poll = () => {
      if (!doc) return resolve();

      const hasGlobalLoadingIndicator = doc.querySelector(
        '[data-test-subj="globalLoadingIndicator"]'
      );

      if (hasGlobalLoadingIndicator) {
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
        // timeout waiting for element to load
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
