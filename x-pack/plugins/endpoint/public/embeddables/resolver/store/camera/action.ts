/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2 } from '../../types';

interface UserScaled {
  readonly type: 'userScaled';
  /**
   * A vector who's `x` and `y` component will be the new scaling factors for the projection.
   */
  readonly payload: Vector2;
}

interface UserZoomed {
  readonly type: 'userZoomed';
  /**
   * A value to zoom in by. Should be a fraction of `1`. For a `'wheel'` event when `event.deltaMode` is `'pixel'`, pass `event.deltaY / -renderHeight` where `renderHeight` is the height of the Resolver element in pixels.
   */
  payload: number;
}

interface UserSetRasterSize {
  readonly type: 'userSetRasterSize';
  /**
   * The dimensions of the Resolver component in pixels. The Resolver component should not be scrollable itself.
   */
  readonly payload: Vector2;
}

// TODO, fix and rename this. or remove it
// this is used to directly set the transform of the camera,
// it should be named something like 'userSetPositionOfCamera'. It should work in conjunction with panning (it doesn't, or at least its not tested or tried.)
interface UserSetPanningOffset {
  readonly type: 'userSetPanningOffset';
  /**
   * The world transform of the camera
   */
  readonly payload: Vector2;
}

interface UserStartedPanning {
  readonly type: 'userStartedPanning';
  /**
   * A vector in screen coordinates (each unit is a pixel and the Y axis increases towards the bottom of the screen.)
   * Represents a starting position during panning for a pointing device.
   */
  readonly payload: Vector2;
}

interface UserContinuedPanning {
  readonly type: 'userContinuedPanning';
  /**
   * A vector in screen coordinates (each unit is a pixel and the Y axis increases towards the bottom of the screen.)
   * Represents the current position during panning for a pointing device.
   */
  readonly payload: Vector2;
}

interface UserStoppedPanning {
  readonly type: 'userStoppedPanning';
}

interface UserCanceledPanning {
  readonly type: 'userCanceledPanning';
}

// This action is blacklisted in redux dev tools
interface UserFocusedOnWorldCoordinates {
  readonly type: 'userFocusedOnWorldCoordinates';
  /**
   * World coordinates indicating a point that the user's pointing device is hoving over.
   * When the camera's scale is changed, we make sure to adjust its tranform so that the these world coordinates are in the same place on the screen
   */
  readonly payload: Vector2;
}

export type CameraAction =
  | UserScaled
  | UserSetRasterSize
  | UserSetPanningOffset
  | UserStartedPanning
  | UserContinuedPanning
  | UserStoppedPanning
  | UserCanceledPanning
  | UserFocusedOnWorldCoordinates
  | UserZoomed;
