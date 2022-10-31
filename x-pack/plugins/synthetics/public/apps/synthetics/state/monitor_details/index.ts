/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../../common/runtime_types';
import { checkIsStalePing } from '../../utils/monitor_test_result/check_pings';

import { IHttpSerializedFetchError } from '../utils/http_error';

import {
  getMonitorRecentPingsAction,
  setMonitorDetailsLocationAction,
  getMonitorAction,
} from './actions';

export interface MonitorDetailsState {
  pings: {
    total: number;
    data: Ping[];
    loading: boolean;
  };
  syntheticsMonitorLoading: boolean;
  syntheticsMonitor: EncryptedSyntheticsSavedMonitor | null;
  error: IHttpSerializedFetchError | null;
  selectedLocationId: string | null;
}

const initialState: MonitorDetailsState = {
  pings: { total: 0, data: [], loading: false },
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

    .addCase(getMonitorRecentPingsAction.get, (state, action) => {
      state.pings.loading = true;
      state.pings.data = state.pings.data.filter(
        (ping) => !checkIsStalePing(action.payload.monitorId, ping)
      );
    })
    .addCase(getMonitorRecentPingsAction.success, (state, action) => {
      state.pings.total = action.payload.total;
      state.pings.data = action.payload.pings;
      state.pings.loading = false;
    })
    .addCase(getMonitorRecentPingsAction.fail, (state, action) => {
      state.error = action.payload;
      state.pings.loading = false;
    })

    .addCase(getMonitorAction.get, (state) => {
      state.syntheticsMonitorLoading = true;
    })
    .addCase(getMonitorAction.success, (state, action) => {
      state.syntheticsMonitor = action.payload;
      state.syntheticsMonitorLoading = false;
    })
    .addCase(getMonitorAction.fail, (state, action) => {
      state.error = action.payload;
      state.syntheticsMonitorLoading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
