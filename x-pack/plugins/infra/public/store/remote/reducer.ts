/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { initialLogEntriesState, logEntriesReducer, LogEntriesState } from './log_entries';
import { initialLogSummaryState, logSummaryReducer, LogSummaryState } from './log_summary';
import { initialSourceState, sourceReducer, SourceState } from './source';

export interface RemoteState {
  logEntries: LogEntriesState;
  logSummary: LogSummaryState;
  source: SourceState;
}

export const initialRemoteState = {
  logEntries: initialLogEntriesState,
  logSummary: initialLogSummaryState,
  source: initialSourceState,
};

export const remoteReducer = combineReducers<RemoteState>({
  logEntries: logEntriesReducer,
  logSummary: logSummaryReducer,
  source: sourceReducer,
});
