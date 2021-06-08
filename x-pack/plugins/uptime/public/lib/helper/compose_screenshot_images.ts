/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotRefImageData } from '../../../common/runtime_types';

/**
 * Draws image fragments on a canvas.
 * @param data Contains overall image size, fragment dimensions, and the blobs of image data to render.
 * @param canvas A canvas to use for the rendering.
 * @returns A promise that will resolve when the final draw operation completes.
 */
export const composeScreenshotRef = async (
  data: ScreenshotRefImageData,
  canvas: HTMLCanvasElement
) => {
  const {
    ref: { screenshotRef, blocks },
  } = data;

  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = screenshotRef.screenshot_ref.width;
  canvas.height = screenshotRef.screenshot_ref.height;

  /**
   * We need to mark each operation as an async task, otherwise when we try
   * to extract a data URL from the canvas it will be blank.
   */
  const drawOperations: Array<Promise<void>> = [];

  for (const block of screenshotRef.screenshot_ref.blocks) {
    drawOperations.push(
      new Promise<void>((r) => {
        const img = new Image();
        const { top, left, width, height, hash } = block;
        const blob = blocks.find((b) => b.id === hash);
        if (!blob)
          throw Error(`Error processing image. Expected image data with hash ${hash} is missing`);
        img.onload = () => {
          ctx?.drawImage(img, left, top, width, height);
          r();
        };
        img.src = `data:image/jpg;base64,${blob.synthetics.blob}`;
      })
    );
  }

  return Promise.all(drawOperations);
};
