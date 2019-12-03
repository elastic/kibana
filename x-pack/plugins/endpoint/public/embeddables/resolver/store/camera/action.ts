/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vector2 } from '../../types';

export interface UserScaled {
  readonly type: 'userScaled';
  readonly payload: Vector2;
}

export interface UserPanned {
  readonly type: 'userPanned';
  readonly payload: Vector2;
}

export interface UserSetRasterSize {
  readonly type: 'userSetRasterSize';
  readonly payload: Vector2;
}

export type CameraAction = UserScaled | UserPanned | UserSetRasterSize;
