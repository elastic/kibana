/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_time');

export interface MetricRangeTimeState {
  to: number;
  from: number;
  interval: string;
}

export const setRangeTime = actionCreator<MetricRangeTimeState>('SET_RANGE_TIME');

export const startMetricsAutoReload = actionCreator('START_METRICS_AUTO_RELOAD');

export const stopMetricsAutoReload = actionCreator('STOP_METRICS_AUTO_RELOAD');
