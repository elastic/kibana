/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

import type { SyntheticsMonitor } from '../../../../../common/runtime_types';
import { getSyntheticsMonitorAction } from './actions';

export interface SyntheticsMonitorState {
  data: SyntheticsMonitor | null;
  loading: boolean;
  error: IHttpFetchError<ResponseErrorBody> | null;
}

const initialState: SyntheticsMonitorState = {
  data: null,
  loading: false,
  error: null,
};

export const syntheticsMonitorReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getSyntheticsMonitorAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getSyntheticsMonitorAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getSyntheticsMonitorAction.fail, (state, action) => {
      state.error = action.payload as IHttpFetchError<ResponseErrorBody>;
      state.loading = false;
    });
});
