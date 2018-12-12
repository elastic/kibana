/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { initialLogEntriesState, logEntriesReducer, LogEntriesState } from './log_entries';
import { initialLogSummaryState, logSummaryReducer, LogSummaryState } from './log_summary';

export interface RemoteState {
  logEntries: LogEntriesState;
  logSummary: LogSummaryState;
}

export const initialRemoteState = {
  logEntries: initialLogEntriesState,
  logSummary: initialLogSummaryState,
};

export const remoteReducer = combineReducers<RemoteState>({
  logEntries: logEntriesReducer,
  logSummary: logSummaryReducer,
});
