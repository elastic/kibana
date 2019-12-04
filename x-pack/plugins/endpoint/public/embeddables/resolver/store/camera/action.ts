/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2 } from '../../types';

interface UserScaled {
  readonly type: 'userScaled';
  readonly payload: Vector2;
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

export type CameraAction =
  | UserScaled
  | UserSetRasterSize
  | UserSetPanningOffset
  | UserStartedPanning
  | UserContinuedPanning
  | UserStoppedPanning
  | UserCanceledPanning;
