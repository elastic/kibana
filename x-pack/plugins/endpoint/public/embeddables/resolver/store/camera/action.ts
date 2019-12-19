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

interface UserSetPanningOffset {
  readonly type: 'userSetPanningOffset';
  readonly payload: Vector2;
}

interface UserStartedPanning {
  readonly type: 'userStartedPanning';
  readonly payload: Vector2;
}

interface UserContinuedPanning {
  readonly type: 'userContinuedPanning';
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
  // client X and Y of mouse event, adjusted for position of resolver on the page
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
