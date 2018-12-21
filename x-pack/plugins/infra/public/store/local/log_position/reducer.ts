/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { TimeKey } from '../../../../common/time';
import {
  jumpToTargetPosition,
  reportVisiblePositions,
  reportVisibleSummary,
  startAutoReload,
  stopAutoReload,
} from './actions';

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
  visiblePositions: {
    startKey: TimeKey | null;
    middleKey: TimeKey | null;
    endKey: TimeKey | null;
  };
  visibleSummary: {
    start: number | null;
    end: number | null;
  };
}

export const initialLogPositionState: LogPositionState = {
  targetPosition: null,
  updatePolicy: {
    policy: 'manual',
  },
  visiblePositions: {
    endKey: null,
    middleKey: null,
    startKey: null,
  },
  visibleSummary: {
    start: null,
    end: null,
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

const visiblePositionReducer = reducerWithInitialState(
  initialLogPositionState.visiblePositions
).case(reportVisiblePositions, (state, { startKey, middleKey, endKey }) => ({
  endKey,
  middleKey,
  startKey,
}));

const visibleSummaryReducer = reducerWithInitialState(initialLogPositionState.visibleSummary).case(
  reportVisibleSummary,
  (state, { start, end }) => ({
    start,
    end,
  })
);

export const logPositionReducer = combineReducers<LogPositionState>({
  targetPosition: targetPositionReducer,
  updatePolicy: targetPositionUpdatePolicyReducer,
  visiblePositions: visiblePositionReducer,
  visibleSummary: visibleSummaryReducer,
});
