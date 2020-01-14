/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { CameraAction } from './action';
import { CameraState, Vector2 } from '../../types';

type CameraStore = Store<CameraState, CameraAction>;

/**
 * Dispatches a 'userScaled' action.
 */
export function userScaled(store: CameraStore, scalingValue: [number, number]): void {
  const action: CameraAction = { type: 'userScaled', payload: scalingValue };
  store.dispatch(action);
}

/**
 * Used to assert that two Vector2s are close to each other (accounting for round-off errors.)
 */
export function expectVectorsToBeClose(first: Vector2, second: Vector2): void {
  expect(first[0]).toBeCloseTo(second[0]);
  expect(first[1]).toBeCloseTo(second[1]);
}
