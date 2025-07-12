/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import html2canvas from 'html2canvas';
import { CaptureResult, CaptureScreenshotOptions } from '../types';
import {
  getSelectorForUrl,
  waitForSelector,
  waitForDomStability,
  waitForIdle,
  waitForNoLoadingCharts,
  canvasToBlob,
} from './utils';

export const captureScreenshot = async (
  url: string,
  options: CaptureScreenshotOptions = {}
): Promise<CaptureResult | null> => {
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

      try {
        const canvas = await html2canvas(element);
        const image = canvas.toDataURL('image/png');
        const blob = await canvasToBlob(canvas);
        cleanup();
        resolve({ image, blob });
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
};
