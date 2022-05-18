/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from '@kbn/core/target/types/public';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { takeLeading } from 'redux-saga/effects';
import { createSelector } from 'reselect';
import { IHttpSerializedFetchError, serializeHttpFetchError } from '../utils/http_error';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  MonitorManagementListResultCodec,
} from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { apiService } from '../../../../utils/api_service';
import { API_URLS } from '../../../../../common/constants';

export type MonitorListSortField = `${keyof EncryptedSyntheticsSavedMonitor}.keyword`;

export interface MonitorListPageState {
  pageIndex: number;
  pageSize: number;
  sortField: MonitorListSortField;
  sortOrder: NonNullable<FetchMonitorManagementListQueryArgs['sortOrder']>;
}

export interface MonitorListState {
  data: MonitorManagementListResult;
  pageState: MonitorListPageState;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const monitorListSlice = createSlice({
  name: 'monitorList',
  initialState: {
    data: { page: 1, perPage: 10, total: null, monitors: [], syncErrors: [] },
    pageState: {
      pageIndex: 0,
      pageSize: 10,
      sortOrder: 'asc',
      sortField: `${ConfigKey.NAME}.keyword`,
    },
    loading: false,
    error: null,
  } as MonitorListState,
  reducers: {
    fetchMonitorListAction: (state, action: PayloadAction<MonitorListPageState>) => {
      state.pageState = action.payload;
      state.loading = true;
    },
    fetchMonitorListActionSuccess: (state, action: PayloadAction<MonitorManagementListResult>) => {
      state.loading = false;
      state.data = action.payload;
    },
    fetchMonitorListActionFail: (state, action: PayloadAction<IHttpFetchError>) => {
      state.loading = false;
      state.error = serializeHttpFetchError(action.payload);
    },
  },
});
export const monitorListReducer = monitorListSlice.reducer;

export const { fetchMonitorListAction, fetchMonitorListActionSuccess, fetchMonitorListActionFail } =
  monitorListSlice.actions;

export const selectMonitorListState = (state: SyntheticsAppState) => state.monitorList;
export const selectEncryptedSyntheticsSavedMonitors = createSelector(
  selectMonitorListState,
  (state) =>
    state.data.monitors.map((monitor) => ({
      ...monitor.attributes,
      id: monitor.id,
    })) as EncryptedSyntheticsSavedMonitor[]
);

function toMonitorManagementListQueryArgs(
  pageState: MonitorListPageState
): FetchMonitorManagementListQueryArgs {
  return {
    perPage: pageState.pageSize,
    page: pageState.pageIndex + 1,
    sortOrder: pageState.sortOrder,
    sortField: pageState.sortField,
    search: '',
    searchFields: [],
  };
}

export const fetchMonitorManagementList = async (
  pageState: MonitorListPageState
): Promise<MonitorManagementListResult> => {
  const params = toMonitorManagementListQueryArgs(pageState);

  return await apiService.get(
    API_URLS.SYNTHETICS_MONITORS,
    params,
    MonitorManagementListResultCodec
  );
};

export function* fetchMonitorListEffect() {
  yield takeLeading(
    fetchMonitorListAction,
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListActionSuccess,
      fetchMonitorListActionFail
    )
  );
}
