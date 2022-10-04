/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { createReducer } from '@reduxjs/toolkit';
import { IHttpSerializedFetchError, serializeHttpFetchError } from '../utils/http_error';
import {
  getMonitorRecentPingsAction,
  setMonitorDetailsLocationAction,
  getMonitorAction,
} from './actions';
import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../../common/runtime_types';

export interface MonitorDetailsState {
  pings: Ping[];
  loading: boolean;
  syntheticsMonitorLoading: boolean;
  syntheticsMonitor: EncryptedSyntheticsSavedMonitor | null;
  error: IHttpSerializedFetchError | null;
  selectedLocationId: string | null;
}

const initialState: MonitorDetailsState = {
  pings: [],
  loading: false,
  syntheticsMonitor: null,
  syntheticsMonitorLoading: false,
  error: null,
  selectedLocationId: null,
};

export const monitorDetailsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setMonitorDetailsLocationAction, (state, action) => {
      state.selectedLocationId = action.payload;
    })

    .addCase(getMonitorRecentPingsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getMonitorRecentPingsAction.success, (state, action) => {
      state.pings = action.payload.pings;
      state.loading = false;
    })
    .addCase(getMonitorRecentPingsAction.fail, (state, action) => {
      state.error = serializeHttpFetchError(action.payload as IHttpFetchError<ResponseErrorBody>);
      state.loading = false;
    })

    .addCase(getMonitorAction.get, (state) => {
      state.syntheticsMonitorLoading = true;
    })
    .addCase(getMonitorAction.success, (state, action) => {
      state.syntheticsMonitor = action.payload;
      state.syntheticsMonitorLoading = false;
    })
    .addCase(getMonitorAction.fail, (state, action) => {
      state.error = serializeHttpFetchError(action.payload as IHttpFetchError<ResponseErrorBody>);
      state.syntheticsMonitorLoading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
