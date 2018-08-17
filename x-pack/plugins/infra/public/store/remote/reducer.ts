/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { entriesReducer, EntriesState, initialEntriesState } from './log_entries';
import { initialSummaryState, summaryReducer, SummaryState } from './log_summary';
import { initialSourceState, sourceReducer, SourceState } from './source';

export interface RemoteState {
  logEntries: EntriesState;
  logSummary: SummaryState;
  source: SourceState;
}

export const initialRemoteState = {
  logEntries: initialEntriesState,
  logSummary: initialSummaryState,
  source: initialSourceState,
};

export const remoteReducer = combineReducers<RemoteState>({
  logEntries: entriesReducer,
  logSummary: summaryReducer,
  source: sourceReducer,
});
