/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MetricTimeState } from './reducer';

export const selectRangeTime = (state: MetricTimeState) => state.timeRange;

export const selectIsAutoReloading = (state: MetricTimeState) =>
  state.updatePolicy.policy === 'interval';

export const selectTimeUpdatePolicyInterval = (state: MetricTimeState) =>
  state.updatePolicy.policy === 'interval' ? state.updatePolicy.interval : null;

export const selectRangeFromTimeRange = (state: MetricTimeState) => {
  const { to, from } = state.timeRange;
  return to - from;
};
