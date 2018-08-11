/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reduceReducers from 'reduce-reducers';
import { combineReducers, Reducer } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { configureSummary } from './actions';
import { loadSummaryReducer } from './load_operation';
import { initialSummaryState, SummaryGraphqlState, SummaryState } from './state';

const summarySummaryReducer = reduceReducers(
  loadSummaryReducer /*, loadMoreSummaryReducer*/
) as Reducer<SummaryGraphqlState>;

const summaryIntervalSizeReducer = reducerWithInitialState(initialSummaryState.intervalSize).case(
  configureSummary,
  (state, { intervalSize }) => intervalSize
);

export const summaryReducer = combineReducers<SummaryState>({
  summary: summarySummaryReducer,
  intervalSize: summaryIntervalSizeReducer,
});
