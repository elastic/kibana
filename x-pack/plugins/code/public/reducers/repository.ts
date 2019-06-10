/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { Repository, RepositoryConfig } from '../../model';

import { RepoConfigs } from '../../model/workspace';
import {
  closeToast,
  deleteRepoFinished,
  fetchRepoConfigSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
  loadConfigsSuccess,
  loadRepoSuccess,
  loadRepoFailed,
  loadRepo,
} from '../actions';

export enum ToastType {
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
  showToast: boolean;
  toastMessage?: string;
  toastType?: ToastType;
  projectConfigs: { [key: string]: RepositoryConfig };
  currentRepository?: Repository;
  repoNotFound: boolean;
}

const initialState: RepositoryState = {
  repositories: [],
  loading: false,
  importLoading: false,
  showToast: false,
  projectConfigs: {},
  repoNotFound: false,
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
    [String(deleteRepoFinished)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, (draft: RepositoryState) => {
        draft.repositories = state.repositories.filter(repo => repo.uri !== action.payload);
      }),
    [String(importRepo)]: (state: RepositoryState) =>
      produce<RepositoryState>(state, draft => {
        draft.importLoading = true;
      }),
    [String(importRepoSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, (draft: RepositoryState) => {
        draft.importLoading = false;
        draft.showToast = true;
        draft.toastType = ToastType.success;
        draft.toastMessage = `${action.payload.name} has been successfully submitted!`;
        draft.repositories = [...state.repositories, action.payload];
      }),
    [String(importRepoFailed)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        if (action.payload) {
          if (action.payload.res.status === 304) {
            draft.toastMessage = 'This Repository has already been imported!';
            draft.showToast = true;
            draft.toastType = ToastType.warning;
            draft.importLoading = false;
          } else {
            draft.toastMessage = action.payload.body.message;
            draft.showToast = true;
            draft.toastType = ToastType.danger;
            draft.importLoading = false;
          }
        }
      }),
    [String(closeToast)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.showToast = false;
      }),
    [String(fetchRepoConfigSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.repoConfigs = action.payload;
      }),
    [String(loadConfigsSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.projectConfigs = action.payload;
      }),
    [String(loadRepo)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.currentRepository = undefined;
        draft.repoNotFound = false;
      }),
    [String(loadRepoSuccess)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.currentRepository = action.payload;
        draft.repoNotFound = false;
      }),
    [String(loadRepoFailed)]: (state: RepositoryState, action: Action<any>) =>
      produce<RepositoryState>(state, draft => {
        draft.currentRepository = undefined;
        draft.repoNotFound = true;
      }),
  },
  initialState
);
