/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import {
  loadRecentProjects,
  loadRecentProjectsFailed,
  loadRecentProjectsSuccess,
} from '../actions/recent_projects';

export interface RecentProjectsState {
  recentProjects: any[];
  loading: boolean;
}

const initialState: RecentProjectsState = {
  recentProjects: [
    {
      name: 'typescript-node-starter',
      timestamp: 1544107468754,
    },
    {
      name: 'typescript-react-starter',
      timestamp: 1544107368754,
    },
    {
      name: 'guava',
      timestamp: 1544107268754,
    },
  ],
  loading: false,
};

export const recentProjects = handleActions(
  {
    [String(loadRecentProjects)]: (state: RecentProjectsState, action: Action<any>) =>
      produce<RecentProjectsState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadRecentProjectsSuccess)]: (state: RecentProjectsState, action: Action<any>) =>
      produce<RecentProjectsState>(state, draft => {
        draft.recentProjects = action.payload;
        draft.loading = false;
      }),
    [String(loadRecentProjectsFailed)]: (state: RecentProjectsState, action: Action<any>) =>
      produce<RecentProjectsState>(state, draft => {
        draft.recentProjects = [];
        draft.loading = false;
      }),
  },
  initialState
);
