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
export async function composeScreenshotRef(
  data: ScreenshotRefImageData,
  canvas: HTMLCanvasElement
) {
  const {
    ref: { screenshotRef, blocks },
  } = data;

  canvas.width = screenshotRef.screenshot_ref.width;
  canvas.height = screenshotRef.screenshot_ref.height;

  const ctx = canvas.getContext('2d', { alpha: false });

  /**
   * We need to treat each operation as an async task, otherwise we will race between drawing image
   * chunks and extracting the final data URL from the canvas; without this, the image could be blank or incomplete.
   */
  const drawOperations: Array<Promise<void>> = [];

  for (const block of screenshotRef.screenshot_ref.blocks) {
    drawOperations.push(
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        const { top, left, width, height, hash } = block;
        const blob = blocks.find((b) => b.id === hash);
        if (!blob) {
          reject(Error(`Error processing image. Expected image data with hash ${hash} is missing`));
        } else {
          img.onload = () => {
            ctx?.drawImage(img, left, top, width, height);
            resolve();
          };
          img.src = `data:image/jpg;base64,${blob.synthetics.blob}`;
        }
      })
    );
  }

  // once all `draw` operations finish, caller can extract img string
  return Promise.all(drawOperations);
}
