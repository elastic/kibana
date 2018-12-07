/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import {
  loadLanguageServers,
  loadLanguageServersFailed,
  loadLanguageServersSuccess,
} from '../actions/language_server';

export interface LanguageServerState {
  languageServers: any[];
  loading: boolean;
}

const initialState: LanguageServerState = {
  languageServers: [
    {
      language: 'java',
      status: 0,
    },
    {
      language: 'typescript',
      status: 1,
    },
    {
      language: 'go',
      status: 2,
    },
  ],
  loading: false,
};

export const languageServer = handleActions(
  {
    [String(loadLanguageServers)]: (state: LanguageServerState, action: Action<any>) =>
      produce<LanguageServerState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadLanguageServersSuccess)]: (state: LanguageServerState, action: Action<any>) =>
      produce<LanguageServerState>(state, draft => {
        draft.languageServers = action.payload;
        draft.loading = false;
      }),
    [String(loadLanguageServersFailed)]: (state: LanguageServerState, action: Action<any>) =>
      produce<LanguageServerState>(state, draft => {
        draft.languageServers = [];
        draft.loading = false;
      }),
  },
  initialState
);
