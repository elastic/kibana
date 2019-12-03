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
  console.log('zoom level', state.zoomLevel);
  const viewWidth = state.rasterSize[0];
  const viewHeight = state.rasterSize[1];
  const halfViewWidth = viewWidth / 2;
  const negativeHalfViewWidth = viewWidth / -2;
  const halfViewHeight = viewHeight / 2;
  const negativeHalfViewHeight = viewHeight / -2;

  const right = halfViewWidth / state.zoomLevel + state.panningOffset[0];
  const left = negativeHalfViewWidth / state.zoomLevel + state.panningOffset[0];
  const top = halfViewHeight / state.zoomLevel + state.panningOffset[1];
  const bottom = negativeHalfViewHeight / state.zoomLevel + state.panningOffset[1];

  console.log('top', top, 'right', right, 'bottom', bottom, 'left', left);
  console.log(
    'x translation',
    -(left + right) / viewWidth,
    'y translation',
    -(top + bottom) / viewHeight
  );

  /*
    raster size [ 300, 200 ]
    panning offset [ 0, 0 ]
    zoom level 1
    top 100 right 150 bottom -100 left -150
    x translation 0 y translation 0
    */

  const leftAlign = -left;
  const topAlign = (top - bottom) / 2;

  return ([worldX, worldY]) => [
    worldX * (viewWidth / (right - left)) + leftAlign,
    -worldY * (viewHeight / (top - bottom)) + topAlign,

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

