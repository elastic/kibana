/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState } from '../../types';

/**
 * https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const worldToRaster: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  const right = (state.rasterSize[0] / 2) * state.zoomLevel + state.panningOffset[0];
  const left = (state.rasterSize[0] / -2) * state.zoomLevel + state.panningOffset[0];
  const top = (state.rasterSize[1] / 2) * state.zoomLevel + state.panningOffset[1];
  const bottom = (state.rasterSize[1] / -2) * state.zoomLevel + state.panningOffset[1];
  return ([worldX, worldY]) => [
    worldX * (state.rasterSize[0] / (right - left)) - (right + left) / (right - left),
    worldY * (state.rasterSize[1] / (top - bottom)) - (top + bottom) / (top - bottom),
  ];
};
