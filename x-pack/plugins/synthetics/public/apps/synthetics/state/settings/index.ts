/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { DynamicSettings } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import { getConnectorsAction, getDynamicSettingsAction, setDynamicSettingsAction } from './actions';
import { ActionConnector } from './api';

export interface DynamicSettingsState {
  settings?: DynamicSettings;
  loadError?: IHttpSerializedFetchError;
  saveError?: IHttpSerializedFetchError;
  loading: boolean;
  connectors?: ActionConnector[];
  connectorsLoading?: boolean;
}

const initialState: DynamicSettingsState = {
  loading: true,
  connectors: [],
};

export const dynamicSettingsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getDynamicSettingsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getDynamicSettingsAction.success, (state, action) => {
      state.settings = action.payload;
      state.loading = false;
    })
    .addCase(getDynamicSettingsAction.fail, (state, action) => {
      state.loadError = action.payload;
      state.loading = false;
    })
    .addCase(setDynamicSettingsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(setDynamicSettingsAction.success, (state, action) => {
      state.settings = action.payload;
      state.loading = false;
    })
    .addCase(setDynamicSettingsAction.fail, (state, action) => {
      state.loadError = action.payload;
      state.loading = false;
    })
    .addCase(getConnectorsAction.get, (state) => {
      state.connectorsLoading = true;
    })
    .addCase(getConnectorsAction.success, (state, action) => {
      state.connectors = action.payload;
      state.connectorsLoading = false;
    })
    .addCase(getConnectorsAction.fail, (state, action) => {
      state.connectorsLoading = false;
    });
});
