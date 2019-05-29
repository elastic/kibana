/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { initialLogEntriesState, logEntriesReducer, LogEntriesState } from './log_entries';

export interface RemoteState {
  logEntries: LogEntriesState;
}

export const initialRemoteState = {
  logEntries: initialLogEntriesState,
};

export const remoteReducer = combineReducers<RemoteState>({
  logEntries: logEntriesReducer,
});
