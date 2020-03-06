/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { jumpToTime, startAutoReload, stopAutoReload } from './actions';

interface ManualTimeUpdatePolicy {
  policy: 'manual';
}

interface IntervalTimeUpdatePolicy {
  policy: 'interval';
  interval: number;
}

type TimeUpdatePolicy = ManualTimeUpdatePolicy | IntervalTimeUpdatePolicy;

export interface WaffleTimeState {
  currentTime: number;
  updatePolicy: TimeUpdatePolicy;
}

export const initialWaffleTimeState: WaffleTimeState = {
  currentTime: Date.now(),
  updatePolicy: {
    policy: 'manual',
  },
};

const currentTimeReducer = reducerWithInitialState(initialWaffleTimeState.currentTime).case(
  jumpToTime,
  (currentTime, targetTime) => targetTime
);

const updatePolicyReducer = reducerWithInitialState(initialWaffleTimeState.updatePolicy)
  .case(startAutoReload, () => ({
    policy: 'interval',
    interval: 5000,
  }))
  .case(stopAutoReload, () => ({
    policy: 'manual',
  }));

export const waffleTimeReducer = combineReducers<WaffleTimeState>({
  currentTime: currentTimeReducer,
  updatePolicy: updatePolicyReducer,
});
