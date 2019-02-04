/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reduceReducers from 'reduce-reducers';
import { Reducer } from 'redux';

import { loadSummaryReducer } from './operations/load';
import { LogSummaryState } from './state';

export const logSummaryReducer = reduceReducers(
  loadSummaryReducer /*, loadMoreSummaryReducer*/
) as Reducer<LogSummaryState>;
