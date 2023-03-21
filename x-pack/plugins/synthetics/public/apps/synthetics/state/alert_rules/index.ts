/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { IHttpSerializedFetchError } from '..';
import { enableDefaultAlertingAction, updateDefaultAlertingAction } from './actions';

export interface DefaultAlertingState {
  success: boolean | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialSettingState: DefaultAlertingState = {
  success: null,
  loading: false,
  error: null,
};

export const defaultAlertingReducer = createReducer(initialSettingState, (builder) => {
  builder
    .addCase(enableDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingAction.success, (state, action) => {
      state.success = Boolean(action.payload);
      state.loading = false;
    })
    .addCase(enableDefaultAlertingAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    })
    .addCase(updateDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(updateDefaultAlertingAction.success, (state, action) => {
      state.success = Boolean(action.payload);
      state.loading = false;
    })
    .addCase(updateDefaultAlertingAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    });
});

export * from './actions';
export * from './effects';
