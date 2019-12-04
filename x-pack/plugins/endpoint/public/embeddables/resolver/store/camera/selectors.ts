/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2, CameraState, CameraStateWhenPanning } from '../../types';

interface Viewport {
  renderWidth: number;
  renderHeight: number;
  clippingPlaneRight: number;
  clippingPlaneTop: number;
  clippingPlaneLeft: number;
  clippingPlaneBottom: number;
}

function viewport(state: CameraState): Viewport {
  const renderWidth = state.rasterSize[0];
  const renderHeight = state.rasterSize[1];
  const clippingPlaneRight = renderWidth / 2 / state.scaling[0];
  const clippingPlaneTop = renderHeight / 2 / state.scaling[1];

  return {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft: -clippingPlaneRight,
    clippingPlaneBottom: -clippingPlaneTop,
  };
}

/**
 * https://en.wikipedia.org/wiki/Orthographic_projection
 *
 */
export const worldToRaster: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = viewport(state);

  return ([worldX, worldY]) => {
    const [translationX, translationY] = translationIncludingActivePanning(state);

    const [xNdc, yNdc] = orthographicProjection(
      worldX + translationX,
      worldY + translationY,
      clippingPlaneTop,
      clippingPlaneRight,
      clippingPlaneBottom,
      clippingPlaneLeft
    );

    // ndc to raster
    return [(renderWidth * (xNdc + 1)) / 2, (renderHeight * (-yNdc + 1)) / 2];
  };
};

function translationIncludingActivePanning(state: CameraState): Vector2 {
  if (userIsPanning(state)) {
    const panningDeltaX = state.currentPanningOffset[0] - state.panningOrigin[0];
    const panningDeltaY = state.currentPanningOffset[1] - state.panningOrigin[1];
    return [
      state.translation[0] + panningDeltaX / state.scaling[0],
      state.translation[1] + panningDeltaY / state.scaling[1],
    ];
  } else {
    return state.translation;
  }
}

export const rasterToWorld: (state: CameraState) => (worldPosition: Vector2) => Vector2 = state => {
  const {
    renderWidth,
    renderHeight,
    clippingPlaneRight,
    clippingPlaneTop,
    clippingPlaneLeft,
    clippingPlaneBottom,
  } = viewport(state);

  return ([rasterX, rasterY]) => {
    const [translationX, translationY] = translationIncludingActivePanning(state);

    // raster to ndc
    const ndcX = (rasterX / renderWidth) * 2 - 1;
    const ndcY = -1 * ((rasterY / renderHeight) * 2 - 1);

    const [panningTranslatedX, panningTranslatedY] = inverseOrthographicProjection(
      ndcX,
      ndcY,
      clippingPlaneTop,
      clippingPlaneRight,
      clippingPlaneBottom,
      clippingPlaneLeft
    );
    return [panningTranslatedX - translationX, panningTranslatedY - translationY];
  };
};

export const scale = (state: CameraState): Vector2 => state.scaling;

export const userIsPanning = (state: CameraState): state is CameraStateWhenPanning =>
  state.panningOrigin !== null;

/**
 * Adjust x, y to be bounded, in scale, of a clipping plane defined by top, right, bottom, left
 *
 * See explanation:
 * https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix
 */
function orthographicProjection(
  x: number,
  y: number,
  top: number,
  right: number,
  bottom: number,
  left: number
): [number, number] {
  const m11 = 2 / (right - left); // adjust x scale to match ndc (-1, 1) bounds
  const m41 = -((right + left) / (right - left));

  const m22 = 2 / (top - bottom); // adjust y scale to match ndc (-1, 1) bounds
  const m42 = -((top + bottom) / (top - bottom));

  const xPrime = x * m11 + m41;
  const yPrime = y * m22 + m42;

  return [xPrime, yPrime];
}

function inverseOrthographicProjection(
  x: number,
  y: number,
  top: number,
  right: number,
  bottom: number,
  left: number
): [number, number] {
  const m11 = (right - left) / 2;
  const m41 = (right + left) / (right - left);

  const m22 = (top - bottom) / 2;
  const m42 = (top + bottom) / (top - bottom);

  const xPrime = x * m11 + m41;
  const yPrime = y * m22 + m42;

  return [xPrime, yPrime];
}
