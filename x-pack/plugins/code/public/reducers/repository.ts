/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { Repository } from '../../model';

import { RepoConfigs } from '../../model/workspace';
import {
  deleteRepoFinished,
  fetchRepoConfigSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  hideCallOut,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
} from '../actions';

export enum CallOutType {
  danger = 'danger',
  success = 'success',
  warning = 'warning',
}

export interface RepositoryState {
  repositories: Repository[];
  error?: Error;
  loading: boolean;
  importLoading: boolean;
  repoConfigs?: RepoConfigs;
  showCallOut: boolean;
  callOutMessage?: string;
  callOutType?: CallOutType;
}

const initialState: RepositoryState = {
  repositories: [],
  loading: false,
  importLoading: false,
  showCallOut: false,
};

export const repository = handleActions(
  {
    [String(fetchRepos)]: (state: RepositoryState) =>
      produce<RepositoryState>(state, draft => {
        draft.loading = true;
      }),
    [String(fetchReposSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.loading = false;
        draft.repositories = action.payload || [];
      }),
    [String(fetchReposFailed)]: (state: RepositoryState, action: Action<any>) => {
      if (action.payload) {
        return produce<RepositoryState>(state, draft => {
          draft.error = action.payload;
          draft.loading = false;
        });
      } else {
        return state;
      }
    },
    [String(deleteRepoSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, (draft: RepositoryState) => {
        feature/merge-code
        draft.repositories = state.repositories.filter(repo => repo.uri !== action.payload);
      }),
    [String(importRepo)]: (state: RepositoryState) =>
      produce<RepositoryState>(state, draft => {
        draft.importLoading = true;
      }),
    [String(importRepoSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, (draft: RepositoryState) => {
        draft.importLoading = false;
        draft.showCallOut = true;
        draft.callOutType = CallOutType.success;
        draft.callOutMessage = `${action.payload.name} has been successfully imported!`;
        draft.repositories = [...state.repositories, action.payload];
      }),
    [String(importRepoFailed)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        if (action.payload) {
          if (action.payload.res.status === 304) {
            draft.callOutMessage = 'This Repository has already been imported!';
            draft.showCallOut = true;
            draft.callOutType = CallOutType.warning;
            draft.importLoading = false;
          } else {
            draft.callOutMessage = action.payload.body.message;
            draft.showCallOut = true;
            draft.callOutType = CallOutType.danger;
            draft.importLoading = false;
          }
        }
      }),
    [String(hideCallOut)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.showCallOut = false;
      }),
    [String(fetchRepoConfigSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.repoConfigs = action.payload;
      }),
  },
  initialState
);
