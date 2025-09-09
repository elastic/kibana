/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';
import { canvasToBlob, getSelectorForUrl, waitForNoGlobalLoadingIndicator } from './utils';
import type { CaptureResult } from '../types';

export const captureScreenshot = async (): Promise<CaptureResult | null> => {
  try {
    const selector = getSelectorForUrl(window.location.href);
    const element = document.querySelector(selector);

    if (!element) return null;

    await waitForNoGlobalLoadingIndicator();

    const canvas = await domtoimage.toCanvas(element as HTMLElement);
    const image = canvas.toDataURL('image/png');
    const blob = await canvasToBlob(canvas);

    return await new Promise((resolve) => {
      resolve({ image, blob });
    });
  } catch (err) {
    return null;
  }
};
