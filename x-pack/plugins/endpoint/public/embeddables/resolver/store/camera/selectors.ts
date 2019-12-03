/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState } from '../../types';

/**
 * https://en.wikipedia.org/wiki/Orthographic_projection
 *
 */
export const worldToRaster: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  console.log('raster size', state.rasterSize);
  console.log('panning offset', state.panningOffset);
  console.log('zoom level', state.scaling);
  const viewWidth = state.rasterSize[0];
  const viewHeight = state.rasterSize[1];
  const halfViewWidth = viewWidth / 2;
  const negativeHalfViewWidth = viewWidth / -2;
  const halfViewHeight = viewHeight / 2;
  const negativeHalfViewHeight = viewHeight / -2;

  const right = halfViewWidth / state.scaling[0]; // + state.panningOffset[0];
  const left = negativeHalfViewWidth / state.scaling[0]; // + state.panningOffset[0];
  const top = halfViewHeight / state.scaling[1]; // + state.panningOffset[1];
  const bottom = negativeHalfViewHeight / state.scaling[1]; // + state.panningOffset[1];

  console.log('top', top, 'right', right, 'bottom', bottom, 'left', left);

  const leftAlign = -left;
  const topAlign = (top - bottom) / 2;

  console.log('leftAlign', leftAlign, 'top align', topAlign);

  return ([worldX, worldY]) => [
    (worldX + state.panningOffset[0]) * (viewWidth / (right - left)) + leftAlign,
    -(worldY + state.panningOffset[1]) * (viewHeight / (top - bottom)) + topAlign,

    /*
     // should be centered
    worldX * (viewWidth / (right - left)) - (left + right) / viewWidth,
    worldY * (viewHeight / (top - bottom)) - (top + bottom) / viewHeight,
    */
    /*
    worldX * (state.rasterSize[0] / (right - left)) - (right + left) / (right - left),
    worldY * (state.rasterSize[1] / (top - bottom)) - (top + bottom) / (top - bottom),
    */
  ];
};

