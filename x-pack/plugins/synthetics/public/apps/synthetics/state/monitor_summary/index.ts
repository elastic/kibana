/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { createReducer } from '@reduxjs/toolkit';
import { getMonitorStatusAction, setMonitorSummaryLocationAction } from './actions';
import { Ping } from '../../../../../common/runtime_types';

export interface MonitorSummaryState {
  data: Ping | null;
  loading: boolean;
  error: IHttpFetchError<ResponseErrorBody> | null;
  selectedLocationId: string | null;
}

const initialState: MonitorSummaryState = {
  data: null,
  loading: false,
  error: null,
  selectedLocationId: null,
};

export const monitorStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setMonitorSummaryLocationAction, (state, action) => {
      state.selectedLocationId = action.payload;
    })
    .addCase(getMonitorStatusAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getMonitorStatusAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getMonitorStatusAction.fail, (state, action) => {
      state.error = action.payload as IHttpFetchError<ResponseErrorBody>;
      state.loading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
