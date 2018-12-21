/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import {
  MetricRangeTimeState,
  setRangeTime,
  startMetricsAutoReload,
  stopMetricsAutoReload,
} from './actions';

interface ManualTimeUpdatePolicy {
  policy: 'manual';
}

interface IntervalTimeUpdatePolicy {
  policy: 'interval';
  interval: number;
}

type TimeUpdatePolicy = ManualTimeUpdatePolicy | IntervalTimeUpdatePolicy;

export interface MetricTimeState {
  timeRange: MetricRangeTimeState;
  updatePolicy: TimeUpdatePolicy;
}

export const initialMetricTimeState: MetricTimeState = {
  timeRange: {
    from: moment()
      .subtract(1, 'hour')
      .valueOf(),
    to: moment().valueOf(),
    interval: '>=1m',
  },
  updatePolicy: {
    policy: 'manual',
  },
};

const timeRangeReducer = reducerWithInitialState(initialMetricTimeState.timeRange).case(
  setRangeTime,
  (state, { to, from }) => ({ ...state, to, from })
);

const updatePolicyReducer = reducerWithInitialState(initialMetricTimeState.updatePolicy)
  .case(startMetricsAutoReload, () => ({
    policy: 'interval',
    interval: 5000,
  }))
  .case(stopMetricsAutoReload, () => ({
    policy: 'manual',
  }));

export const metricTimeReducer = combineReducers<MetricTimeState>({
  timeRange: timeRangeReducer,
  updatePolicy: updatePolicyReducer,
});
