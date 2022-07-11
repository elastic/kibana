/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { ConfigKey, MonitorManagementListResult } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError, serializeHttpFetchError } from '../utils/http_error';

import { MonitorListPageState } from './models';
import { fetchMonitorListAction } from './actions';

export interface MonitorListState {
  data: MonitorManagementListResult;
  pageState: MonitorListPageState;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: MonitorListState = {
  data: { page: 1, perPage: 10, total: null, monitors: [], syncErrors: [], absoluteTotal: 0 },
  pageState: {
    pageIndex: 0,
    pageSize: 10,
    sortOrder: 'asc',
    sortField: `${ConfigKey.NAME}.keyword`,
  },
  loading: false,
  error: null,
};

export const monitorListReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorListAction.get, (state, action) => {
      state.pageState = action.payload;
      state.loading = true;
    })
    .addCase(fetchMonitorListAction.success, (state, action) => {
      state.loading = false;
      state.data = action.payload;
    })
    .addCase(fetchMonitorListAction.fail, (state, action) => {
      state.loading = false;
      state.error = serializeHttpFetchError(action.payload);
    });
});

export * from './api';
export * from './models';
export * from './actions';
export * from './effects';
export * from './selectors';
export { fetchDeleteMonitor, fetchUpsertMonitor, fetchCreateMonitor } from './api';
