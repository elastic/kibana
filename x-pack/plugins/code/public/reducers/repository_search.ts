/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';

import { Action, handleActions } from 'redux-actions';

import {
  changeSearchScope,
  repositorySearch as repositorySearchAction,
  repositorySearchFailed,
  RepositorySearchPayload,
  repositorySearchSuccess,
} from '../actions/search';

export interface RepositorySearchState {
  scope: string;
  query: string;
  isLoading: boolean;
  repositories: any;
  error?: Error;
}

const initialState: RepositorySearchState = {
  scope: '',
  query: '',
  isLoading: false,
  repositories: {},
};

export const repositorySearch = handleActions(
  {
    [String(repositorySearchAction)]: (
      state: RepositorySearchState,
      action: Action<RepositorySearchPayload>
    ) =>
      produce<RepositorySearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload.query;
          draft.isLoading = true;
        }
      }),
    [String(repositorySearchSuccess)]: (state: RepositorySearchState, action: Action<any>) =>
      produce<RepositorySearchState>(state, draft => {
        draft.repositories = action.payload;
        draft.isLoading = false;
      }),
    [String(changeSearchScope)]: (state: RepositorySearchState, action: Action<any>) =>
      produce<RepositorySearchState>(state, draft => {
        draft.scope = action.payload;
        draft.isLoading = false;
      }),
    [String(repositorySearchFailed)]: (state: RepositorySearchState, action: Action<any>) => {
      if (action.payload) {
        return produce<RepositorySearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload.error;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
