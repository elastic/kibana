/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../../common/runtime_types';
import { checkIsStalePing } from '../../utils/monitor_test_result/check_pings';
import { enableMonitorAlertAction } from '../monitor_list/actions';

import { IHttpSerializedFetchError } from '../utils/http_error';

import {
  getMonitorLastRunAction,
  updateMonitorLastRunAction,
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
  lastRun: {
    data?: Ping;
    loading: boolean;
  };
  syntheticsMonitorLoading: boolean;
  syntheticsMonitor: EncryptedSyntheticsSavedMonitor | null;
  syntheticsMonitorDispatchedAt: number;
  error: IHttpSerializedFetchError | null;
  selectedLocationId: string | null;
}

const initialState: MonitorDetailsState = {
  pings: { total: 0, data: [], loading: false },
  lastRun: { loading: false },
  syntheticsMonitor: null,
  syntheticsMonitorLoading: false,
  syntheticsMonitorDispatchedAt: 0,
  error: null,
  selectedLocationId: null,
};

export const monitorDetailsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setMonitorDetailsLocationAction, (state, action) => {
      state.selectedLocationId = action.payload;
    })
    .addCase(getMonitorLastRunAction.get, (state, action) => {
      state.lastRun.loading = true;
      if (checkIsStalePing(action.payload.monitorId, state.lastRun.data)) {
        state.lastRun.data = undefined;
      }
    })
    .addCase(getMonitorLastRunAction.success, (state, action) => {
      state.lastRun.loading = false;
      state.lastRun.data = action.payload.pings[0];
    })
    .addCase(getMonitorLastRunAction.fail, (state, action) => {
      state.lastRun.loading = false;
      state.error = action.payload;
    })
    .addCase(updateMonitorLastRunAction, (state, action) => {
      state.lastRun.data = action.payload.data;
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

    .addCase(getMonitorAction.get, (state, action) => {
      state.syntheticsMonitorDispatchedAt = action.meta.dispatchedAt;
      state.syntheticsMonitorLoading = true;
    })
    .addCase(getMonitorAction.success, (state, action) => {
      state.syntheticsMonitor = action.payload;
      state.syntheticsMonitorLoading = false;
    })
    .addCase(getMonitorAction.fail, (state, action) => {
      state.error = action.payload;
      state.syntheticsMonitorLoading = false;
    })
    .addCase(enableMonitorAlertAction.success, (state, action) => {
      if ('updated_at' in action.payload && state.syntheticsMonitor) {
        state.syntheticsMonitor = action.payload.attributes as EncryptedSyntheticsSavedMonitor;
      }
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
