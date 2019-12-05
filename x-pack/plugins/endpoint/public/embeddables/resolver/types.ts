/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface ResolverState {
  readonly camera: CameraState;
}

export { ResolverAction } from './actions';

type PanningState =
  | {
      // When we start panning, track the clientX and Y
      readonly panningOrigin: Vector2;

      // This value holds the current clientX and Y when panning. The difference between this
      // and panningOrigin is a vector that expresses how much and where we've panned this time
      readonly currentPanningOffset: Vector2;
    }
  | {
      readonly panningOrigin: null;
      readonly currentPanningOffset: null;
    };

export type CameraState = PanningState & {
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
};

export type Vector2 = readonly [number, number];

export type Vector3 = readonly [number, number, number];

export interface AABB {
  readonly minimum: Vector2;
  readonly maximum: Vector2;
}

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
