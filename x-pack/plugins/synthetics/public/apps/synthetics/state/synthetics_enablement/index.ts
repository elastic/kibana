/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  getSyntheticsEnablement,
  getSyntheticsEnablementSuccess,
  disableSynthetics,
  disableSyntheticsSuccess,
  disableSyntheticsFailure,
  enableSynthetics,
  enableSyntheticsSuccess,
  enableSyntheticsFailure,
  getSyntheticsEnablementFailure,
} from './actions';
import { MonitorManagementEnablementResult } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '../utils/http_error';

export interface SyntheticsEnablementState {
  loading: boolean;
  error: IHttpSerializedFetchError | null;
  enablement: MonitorManagementEnablementResult | null;
}

export const initialState: SyntheticsEnablementState = {
  loading: false,
  error: null,
  enablement: null,
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

    .addCase(disableSynthetics, (state) => {
      state.loading = true;
    })
    .addCase(disableSyntheticsSuccess, (state, action) => {
      state.loading = false;
      state.error = null;
      state.enablement = {
        canEnable: state.enablement?.canEnable ?? false,
        areApiKeysEnabled: state.enablement?.areApiKeysEnabled ?? false,
        canManageApiKeys: state.enablement?.canManageApiKeys ?? false,
        isEnabled: false,
        isValidApiKey: true,
      };
    })
    .addCase(disableSyntheticsFailure, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })

    .addCase(enableSynthetics, (state) => {
      state.loading = true;
    })
    .addCase(enableSyntheticsSuccess, (state, action) => {
      state.loading = false;
      state.error = null;
      state.enablement = {
        canEnable: state.enablement?.canEnable ?? false,
        areApiKeysEnabled: state.enablement?.areApiKeysEnabled ?? false,
        canManageApiKeys: state.enablement?.canManageApiKeys ?? false,
        isValidApiKey: state.enablement?.isValidApiKey ?? false,
        isEnabled: true,
      };
    })
    .addCase(enableSyntheticsFailure, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
