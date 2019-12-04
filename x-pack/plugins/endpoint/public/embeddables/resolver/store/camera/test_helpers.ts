/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { CameraAction } from './action';
import { CameraState } from '../../types';

export function userScaled(
  store: Store<CameraState, CameraAction>,
  scalingValue: [number, number]
): void {
  const action: CameraAction = { type: 'userScaled', payload: scalingValue };
  store.dispatch(action);
}
