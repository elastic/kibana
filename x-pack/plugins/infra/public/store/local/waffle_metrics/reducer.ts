/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { InfraMetricInput, InfraMetricType } from '../../../../common/graphql/types';
import { changeMetrics } from './actions';

export interface WaffleMetricsState {
  metrics: InfraMetricInput[];
}

export const initialWaffleMetricsState: WaffleMetricsState = {
  metrics: [{ type: InfraMetricType.cpu }],
};

const currentMetricsReducer = reducerWithInitialState(initialWaffleMetricsState.metrics).case(
  changeMetrics,
  (currentMetrics, targetMetrics) => targetMetrics
);

export const waffleMetricsReducer = combineReducers<WaffleMetricsState>({
  metrics: currentMetricsReducer,
});
