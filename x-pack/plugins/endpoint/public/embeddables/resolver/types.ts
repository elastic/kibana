/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Redux state for the Resolver feature. Properties on this interface are populated via multiple reducers using redux's `combineReducers`.
 */
export interface ResolverState {
  /**
   * Contains the state of the camera. This includes panning interactions, transform, and projection.
   */
  readonly camera: CameraState;
}

export { ResolverAction } from './actions';

interface PanningState {
  /**
   * Screen coordinate vector representing the starting point when panning.
   */
  readonly origin: Vector2;

  /**
   * Screen coordinate vector representing the current point when panning.
   */
  readonly currentOffset: Vector2;
}

/**
 * Redux state for the virtual 'camera' used by Resolver.
 */
export interface CameraState {
  /**
   * Contains the starting and current position of the pointer when the user is panning the map.
   */
  readonly panning?: PanningState;

  /**
   * Scales the coordinate system, used for zooming.
   */
  readonly scaling: Vector2;

  /**
   * The size (in pixels) of the Resolver component.
   */
  readonly rasterSize: Vector2;

  /**
   * The camera world transform not counting any change from panning. When panning finishes, this value is updated to account for it.
   * Use the `transform` selector to get the transform adjusted for panning.
   */
  readonly translationNotCountingCurrentPanning: Vector2;

  /**
   * The world coordinates that the pointing device was last over. This is used during mousewheel zoom.
   */
  readonly latestFocusedWorldCoordinates: Vector2 | null;
}

export type Vector2 = readonly [number, number];

export type Vector3 = readonly [number, number, number];

/**
 * A rectangle with sides that align with the `x` and `y` axises.
 */
export interface AABB {
  /**
   * Vector who's `x` component is the _left_ side of the AABB and who's `y` component is the _bottom_ side of the AABB.
   **/
  readonly minimum: Vector2;
  /**
   * Vector who's `x` component is the _right_ side of the AABB and who's `y` component is the _bottom_ side of the AABB.
   **/
  readonly maximum: Vector2;
}

/**
 * A 2D transformation matrix in row-major order.
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
