/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Redux state for the Resolver feature. Properties on this interface are populated via multiple reducers using redux's `combineReducers`.
 */
export interface ResolverState {
  readonly camera: CameraState;
}

export { ResolverAction } from './actions';

interface PanningState {
  readonly origin: Vector2;
  readonly currentOffset: Vector2;
}

export interface CameraState {
  readonly panning?: PanningState;

  readonly scaling: Vector2;
  /**
   * the size (in pixels) of the REsolver element
   */
  readonly rasterSize: Vector2;
  // When we finish panning, we add the current panning vector to this vector to get the position of the camera.
  // When we start panning again, we add the 'currentPanningOffset - panningOrigin' to this value to get the position of the camera
  readonly translationNotCountingCurrentPanning: Vector2;
  // This is the world coordinates of the current mouse position. used to keep wheel zoom smooth (any other stuff eventually?)
  readonly latestFocusedWorldCoordinates: Vector2 | null;
}

export type Vector2 = readonly [number, number];

export type Vector3 = readonly [number, number, number];

/**
 * A rectangle with sides that align with the `x` and `y` axises.
 */
export interface AABB {
  readonly minimum: Vector2;
  readonly maximum: Vector2;
}

/**
 * A 2D transformation matrix in row-major order
 */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];
