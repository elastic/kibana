/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2 } from '../../types';

// Sets scaling directly. This is not what mouse interactions should use, more like programatic zooming
interface UserScaled {
  readonly type: 'userScaled';
  readonly payload: Vector2;
}

interface UserZoomed {
  readonly type: 'userZoomed';
  // generally pass mouse wheels deltaY (when deltaMode is pixel) divided by -renderHeight
  payload: number;
}

interface UserSetRasterSize {
  readonly type: 'userSetRasterSize';
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
