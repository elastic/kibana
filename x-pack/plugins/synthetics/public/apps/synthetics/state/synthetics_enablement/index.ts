/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { AssetsCheckResult } from './api';
import {
  getSyntheticsEnablement,
  getSyntheticsEnablementSuccess,
  getSyntheticsEnablementFailure,
  getSyntheticsAssetsChecks,
} from './actions';
import { MonitorManagementEnablementResult } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '../utils/http_error';

export interface SyntheticsEnablementState {
  loading: boolean;
  error: IHttpSerializedFetchError | null;
  assetCheckError?: IHttpSerializedFetchError | null;
  assetCheckLoading?: boolean;
  enablement: MonitorManagementEnablementResult | null;
  assetCheckResult?: AssetsCheckResult | null;
}

export const initialState: SyntheticsEnablementState = {
  loading: false,
  assetCheckLoading: false,
  error: null,
  enablement: null,
  assetCheckResult: null,
};

export const syntheticsEnablementReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getSyntheticsEnablement, (state) => {
      state.loading = true;
    })
    .addCase(getSyntheticsEnablementSuccess, (state, action) => {
      state.loading = false;
      state.error = null;
      state.enablement = action.payload;
    })
    .addCase(getSyntheticsEnablementFailure, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    .addCase(getSyntheticsAssetsChecks.get, (state) => {
      state.assetCheckLoading = true;
    })
    .addCase(getSyntheticsAssetsChecks.success, (state, action) => {
      state.assetCheckLoading = false;
      state.assetCheckError = null;
      state.assetCheckResult = action.payload;
    })
    .addCase(getSyntheticsAssetsChecks.fail, (state, action) => {
      state.assetCheckLoading = false;
      state.assetCheckError = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
