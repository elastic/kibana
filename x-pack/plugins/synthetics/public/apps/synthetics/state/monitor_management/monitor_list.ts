/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { takeLeading } from 'redux-saga/effects';
import { IHttpFetchError } from '@kbn/core/public';
import { createAsyncAction, Nullable } from '../utils/actions';
import {
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  MonitorManagementListResultCodec,
} from '../../../../../common/runtime_types';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { apiService } from '../../../../utils/api_service';
import { API_URLS } from '../../../../../common/constants';

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

export const fetchMonitorManagementList = async (
  params: FetchMonitorManagementListQueryArgs
): Promise<MonitorManagementListResult> => {
  return await apiService.get(
    API_URLS.SYNTHETICS_MONITORS,
    params,
    MonitorManagementListResultCodec
  );
};

export function* fetchMonitorListEffect() {
  yield takeLeading(
    String(fetchMonitorListAction.get),
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListAction.success,
      fetchMonitorListAction.fail
    )
  );
}
