/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { createReducer } from '@reduxjs/toolkit';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';

import { SavedObject } from '@kbn/core-saved-objects-common';
import {
  ConfigKey,
  MonitorManagementListResult,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

import { MonitorListPageState } from './models';
import {
  clearMonitorUpsertStatus,
  enableMonitorAlertAction,
  fetchMonitorListAction,
  fetchUpsertFailureAction,
  fetchUpsertMonitorAction,
  fetchUpsertSuccessAction,
} from './actions';

export interface MonitorListState {
  data: MonitorManagementListResult;
  monitorUpsertStatuses: Record<
    string,
    { status: FETCH_STATUS; enabled?: boolean; alertStatus?: FETCH_STATUS }
  >;
  pageState: MonitorListPageState;
  loading: boolean;
  loaded: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: MonitorListState = {
  data: { page: 1, perPage: 10, total: null, monitors: [], syncErrors: [], absoluteTotal: 0 },
  monitorUpsertStatuses: {},
  pageState: {
    pageIndex: 0,
    pageSize: 10,
    sortOrder: 'asc',
    sortField: `${ConfigKey.NAME}.keyword`,
  },
  loading: false,
  loaded: false,
  error: null,
};

export const monitorListReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorListAction.get, (state, action) => {
      if (!isEqual(state.pageState, action.payload)) {
        state.pageState = action.payload;
      }
      state.loading = true;
      state.loaded = false;
    })
    .addCase(fetchMonitorListAction.success, (state, action) => {
      state.loading = false;
      state.loaded = true;
      state.data = action.payload;
    })
    .addCase(fetchMonitorListAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    .addCase(fetchUpsertMonitorAction, (state, action) => {
      state.monitorUpsertStatuses[action.payload.configId] = {
        status: FETCH_STATUS.LOADING,
      };
    })
    .addCase(fetchUpsertSuccessAction, (state, action) => {
      state.monitorUpsertStatuses[action.payload.id] = {
        status: FETCH_STATUS.SUCCESS,
        enabled: action.payload.attributes.enabled,
      };
    })
    .addCase(fetchUpsertFailureAction, (state, action) => {
      state.monitorUpsertStatuses[action.payload.configId] = { status: FETCH_STATUS.FAILURE };
    })
    .addCase(enableMonitorAlertAction.get, (state, action) => {
      state.monitorUpsertStatuses[action.payload.configId] = {
        ...state.monitorUpsertStatuses[action.payload.configId],
        alertStatus: FETCH_STATUS.LOADING,
      };
    })
    .addCase(enableMonitorAlertAction.success, (state, action) => {
      state.monitorUpsertStatuses[action.payload.id] = {
        ...state.monitorUpsertStatuses[action.payload.id],
        alertStatus: FETCH_STATUS.SUCCESS,
      };
      if ('updated_at' in action.payload) {
        state.data.monitors = state.data.monitors.map((monitor) => {
          if (monitor.id === action.payload.id) {
            return action.payload as SavedObject<SyntheticsMonitor>;
          }
          return monitor;
        });
      }
    })
    .addCase(enableMonitorAlertAction.fail, (state, action) => {
      state.monitorUpsertStatuses[action.payload.configId] = {
        ...state.monitorUpsertStatuses[action.payload.configId],
        alertStatus: FETCH_STATUS.FAILURE,
      };
    })
    .addCase(clearMonitorUpsertStatus, (state, action) => {
      if (state.monitorUpsertStatuses[action.payload]) {
        delete state.monitorUpsertStatuses[action.payload];
      }
    });
});

export * from './api';
export * from './models';
export * from './actions';
export * from './effects';
export * from './selectors';
export { fetchDeleteMonitor, fetchUpsertMonitor, fetchCreateMonitor } from './api';
