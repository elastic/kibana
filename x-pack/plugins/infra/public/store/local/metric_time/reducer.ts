/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { MetricRangeTimeState, setRangeTime, startAutoReload, stopAutoReload } from './actions';

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
    to: moment()
      .subtract(1, 'hour')
      .millisecond(),
    from: moment().millisecond(),
  },
  updatePolicy: {
    policy: 'manual',
  },
};

const timeRangeReducer = reducerWithInitialState(initialMetricTimeState.timeRange).case(
  setRangeTime,
  (state, { to, from }) => ({ to, from })
);

const updatePolicyReducer = reducerWithInitialState(initialMetricTimeState.updatePolicy)
  .case(startAutoReload, () => ({
    policy: 'interval',
    interval: 5000,
  }))
  .case(stopAutoReload, () => ({
    policy: 'manual',
  }));

export const metricTimeReducer = combineReducers<MetricTimeState>({
  timeRange: timeRangeReducer,
  updatePolicy: updatePolicyReducer,
});
