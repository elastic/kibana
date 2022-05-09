/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { takeLeading } from 'redux-saga/effects';
import {
  FetchMonitorManagementListQueryArgs,
  MonitorManagementListResult,
  MonitorManagementListResultCodec,
} from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { apiService } from '../../../../utils/api_service';
import { API_URLS } from '../../../../../common/constants';

export const monitorListSlice = createSlice({
  name: 'monitorList',
  initialState: {
    data: {} as MonitorManagementListResult,
    loading: false,
  },
  reducers: {
    fetchMonitorListAction: (state, action) => {
      return {
        ...state,
        loading: true,
      };
    },
    fetchMonitorListActionSuccess: (state, action: PayloadAction<MonitorManagementListResult>) => {
      return {
        ...state,
        loading: false,
        data: action.payload,
      };
    },
    fetchMonitorListActionFail: (state, action) => {
      return {
        ...state,
        loading: false,
        data: action.payload,
      };
    },
  },
});

export const { fetchMonitorListAction, fetchMonitorListActionSuccess, fetchMonitorListActionFail } =
  monitorListSlice.actions;

export const monitorListSelector = (state: SyntheticsAppState) => state.monitorList.data;

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
    fetchMonitorListAction,
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListActionSuccess,
      fetchMonitorListActionFail
    )
  );
}
