/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { MonitorOverviewState } from './models';

import {
  clearOverviewStatusErrorAction,
  fetchMonitorOverviewAction,
  fetchOverviewStatusAction,
  quietFetchOverviewAction,
  setFlyoutConfig,
  setOverviewPageStateAction,
} from './actions';

const initialState: MonitorOverviewState = {
  data: {
    total: 0,
    allMonitorIds: [],
    monitors: [],
  },
  pageState: {
    perPage: 16,
    sortOrder: 'asc',
    sortField: 'status',
  },
  flyoutConfig: null,
  loading: false,
  loaded: false,
  error: null,
  status: null,
  statusError: null,
};

export const monitorOverviewReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorOverviewAction.get, (state, action) => {
      state.loading = true;
      state.loaded = false;
    })
    .addCase(fetchMonitorOverviewAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
      state.loaded = true;
    })
    .addCase(fetchMonitorOverviewAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    .addCase(quietFetchOverviewAction.success, (state, action) => {
      state.data = action.payload;
    })
    .addCase(quietFetchOverviewAction.fail, (state, action) => {
      state.error = action.payload;
    })
    .addCase(setOverviewPageStateAction, (state, action) => {
      state.pageState = {
        ...state.pageState,
        ...action.payload,
      };
      state.loaded = false;
    })
    .addCase(fetchOverviewStatusAction.get, (state) => {
      state.status = null;
    })
    .addCase(setFlyoutConfig, (state, action) => {
      state.flyoutConfig = action.payload;
    })
    .addCase(fetchOverviewStatusAction.success, (state, action) => {
      state.status = action.payload;
    })
    .addCase(fetchOverviewStatusAction.fail, (state, action) => {
      state.statusError = action.payload;
    })
    .addCase(clearOverviewStatusErrorAction, (state) => {
      state.statusError = null;
    });
});

export * from './models';
export * from './actions';
export * from './effects';
export * from './selectors';
export { fetchMonitorOverview } from './api';
