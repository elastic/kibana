/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { TimeKey } from '../../../../../common/time';
import { jumpToTargetPosition, startAutoReload, stopAutoReload } from './actions';

interface ManualTargetPositionUpdatePolicy {
  policy: 'manual';
}

interface IntervalTargetPositionUpdatePolicy {
  policy: 'interval';
  interval: number;
}

type TargetPositionUpdatePolicy =
  | ManualTargetPositionUpdatePolicy
  | IntervalTargetPositionUpdatePolicy;

export interface LogPositionState {
  targetPosition: TimeKey | null;
  updatePolicy: TargetPositionUpdatePolicy;
}

export const initialLogPositionState: LogPositionState = {
  targetPosition: null,
  updatePolicy: {
    policy: 'manual',
  },
};

const targetPositionReducer = reducerWithInitialState(initialLogPositionState.targetPosition).case(
  jumpToTargetPosition,
  (state, target) => target
);

const targetPositionUpdatePolicyReducer = reducerWithInitialState(
  initialLogPositionState.updatePolicy
)
  .case(startAutoReload, (state, interval) => ({
    policy: 'interval',
    interval,
  }))
  .case(stopAutoReload, () => ({
    policy: 'manual',
  }));

export const logPositionReducer = combineReducers<LogPositionState>({
  targetPosition: targetPositionReducer,
  updatePolicy: targetPositionUpdatePolicyReducer,
});
