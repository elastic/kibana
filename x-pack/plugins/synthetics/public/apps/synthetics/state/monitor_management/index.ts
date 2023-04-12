/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { IHttpSerializedFetchError } from '..';
import { ThrottlingConfig } from '../../../../../common/runtime_types';

import { fetchMonitorProfileAction } from './actions';

export interface MonitorManagementState {
  profiles: ThrottlingConfig[];
  loading?: boolean;
  loaded?: boolean;
  error?: IHttpSerializedFetchError | null;
}

const initialState: MonitorManagementState = {
  profiles: [],
  loading: false,
  loaded: false,
};

export const monitorManagementReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorProfileAction.get, (state, action) => {
      state.loading = true;
      state.loaded = false;
    })
    .addCase(fetchMonitorProfileAction.success, (state, action) => {
      state.profiles = action.payload ?? [];
      state.loading = false;
      state.loaded = true;
    })
    .addCase(fetchMonitorProfileAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});
