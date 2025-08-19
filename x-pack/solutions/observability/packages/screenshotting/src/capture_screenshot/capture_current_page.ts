/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import html2canvas from 'html2canvas';
import { canvasToBlob, scrollAndLoadFully, wait } from './utils';
import type { CaptureResult } from '../types';

export const takeScreenshot = async (): Promise<CaptureResult | null> => {
  try {
    const element = document.querySelector('main');

    if (!element) return null;

    await scrollAndLoadFully();
    await wait(5000);

    const canvas = await html2canvas(element as HTMLElement);
    const image = canvas.toDataURL('image/png');
    const blob = await canvasToBlob(canvas);

    return await new Promise((resolve) => {
      resolve({ image, blob });
    });
  } catch (err) {
    return null;
  }
};
