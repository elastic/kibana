/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { IHttpFetchError } from '@kbn/core/public';
import { createAsyncAction, Nullable } from '../utils/actions';
import { MonitorManagementListResult } from '../../../../../common/runtime_types';

export const fetchMonitorListAction = createAsyncAction<void, MonitorManagementListResult>(
  'fetchMonitorListAction'
);

export const monitorListReducer = createReducer(
  {
    data: {} as MonitorManagementListResult,
    loading: false,
    error: null as Nullable<IHttpFetchError>,
  },
  (builder) => {
    builder
      .addCase(fetchMonitorListAction.get, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchMonitorListAction.success, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchMonitorListAction.fail, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
);
