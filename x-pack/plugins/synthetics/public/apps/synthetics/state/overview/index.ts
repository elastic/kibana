/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { MonitorOverviewResult, OverviewStatus } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

import { MonitorOverviewPageState, MonitorOverviewFlyoutConfig } from './models';
import {
  clearOverviewStatusErrorAction,
  fetchMonitorOverviewAction,
  fetchOverviewStatusAction,
  quietFetchOverviewAction,
  setFlyoutConfig,
  setOverviewPageStateAction,
} from './actions';

export interface MonitorOverviewState {
  data: MonitorOverviewResult;
  pageState: MonitorOverviewPageState;
  flyoutConfig: MonitorOverviewFlyoutConfig;
  loading: boolean;
  loaded: boolean;
  error: IHttpSerializedFetchError | null;
  status: OverviewStatus | null;
  statusError: IHttpSerializedFetchError | null;
}

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
      state.pageState = action.payload;
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
