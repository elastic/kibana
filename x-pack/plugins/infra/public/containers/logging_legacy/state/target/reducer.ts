/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { TimeKey } from '../../../../../common/time';
import { jumpToTargetPosition, startAutoReload, stopAutoReload } from './actions';

interface ManualTargetUpdatePolicy {
  policy: 'manual';
}

interface IntervalTargetUpdatePolicy {
  policy: 'interval';
  interval: number;
}

type TargetUpdatePolicy = ManualTargetUpdatePolicy | IntervalTargetUpdatePolicy;

export interface TargetState {
  targetPosition: TimeKey | null;
  updatePolicy: TargetUpdatePolicy;
}

export const initialTargetState: TargetState = {
  targetPosition: null,
  updatePolicy: {
    policy: 'manual',
  },
};

const targetPositionReducer = reducerWithInitialState(initialTargetState.targetPosition).case(
  jumpToTargetPosition,
  (state, target) => target
);

const targetUpdatePolicyReducer = reducerWithInitialState(initialTargetState.updatePolicy)
  .case(startAutoReload, (state, interval) => ({
    policy: 'interval',
    interval,
  }))
  .case(stopAutoReload, () => ({
    policy: 'manual',
  }));

export const targetReducer = combineReducers<TargetState>({
  targetPosition: targetPositionReducer,
  updatePolicy: targetUpdatePolicyReducer,
});
