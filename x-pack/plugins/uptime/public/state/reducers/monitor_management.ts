/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { getMonitors, getMonitorsSuccess, getMonitorsFailure } from '../actions';
import { MonitorManagementListResult } from '../../../common/runtime_types';

export interface MonitorManagementList {
  error?: Error;
  loading: boolean;
  list: MonitorManagementListResult;
}

export const initialState: MonitorManagementList = {
  list: {
    page: null,
    perPage: null,
    total: null,
    monitors: [],
  },
  loading: false,
};

export const monitorManagementListReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getMonitors, (state: WritableDraft<MonitorManagementList>) => ({
      ...state,
      loading: true,
    }))
    .addCase(
      getMonitorsSuccess,
      (
        state: WritableDraft<MonitorManagementList>,
        action: PayloadAction<MonitorManagementListResult>
      ) => ({
        ...state,
        loading: false,
        error: undefined,
        list: { ...action.payload },
      })
    )
    .addCase(
      getMonitorsFailure,
      (state: WritableDraft<MonitorManagementList>, action: PayloadAction<Error>) => ({
        ...state,
        loading: false,
        error: action.payload,
      })
    );
});
