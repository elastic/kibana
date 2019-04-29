/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialLocalState, localReducer, LocalState } from './local';
import { initialRemoteState, remoteReducer, RemoteState } from './remote';

export interface State {
  local: LocalState;
  remote: RemoteState;
}

export const initialState: State = {
  local: initialLocalState,
  remote: initialRemoteState,
};

export const reducer = combineReducers<State>({
  local: localReducer,
  remote: remoteReducer,
});
