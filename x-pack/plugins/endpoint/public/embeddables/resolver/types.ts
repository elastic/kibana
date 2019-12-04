/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface ResolverState {
  camera: CameraState;
}

export { ResolverAction } from './actions';

export interface CameraState {
  readonly scaling: Vector2;
  readonly rasterSize: Vector2;
  readonly translationNotCountingCurrentPanning: Vector2;
  readonly panningOrigin: Vector2 | null;
  readonly currentPanningOffset: Vector2 | null;
}

export interface CameraStateWhenPanning extends CameraState {
  readonly panningOrigin: Vector2;
  readonly currentPanningOffset: Vector2;
}

export type Vector2 = readonly [number, number];

export interface AABB {
  readonly minimum: Vector2;
  readonly maximum: Vector2;
}
