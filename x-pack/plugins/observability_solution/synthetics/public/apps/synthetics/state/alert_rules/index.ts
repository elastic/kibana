/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { IHttpSerializedFetchError } from '..';
import {
  enableDefaultAlertingAction,
  enableDefaultAlertingSilentlyAction,
  getDefaultAlertingAction,
  putSyntheticsRules,
  updateDefaultAlertingAction,
} from './actions';

export interface RuleInfo {
  id: string;
  enabled: boolean;
  name: string;
  rule_type_id: string;
}

export interface DefaultAlertingState {
  syntheticsRules?: RuleInfo[];
  data?: DEFAULT_ALERT_RESPONSE;
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
    .addCase(getDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingSilentlyAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingAction.success, (state, action) => {
      state.data = action.payload;
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
    .addCase(putSyntheticsRules, (state, action) => {
      state.syntheticsRules = action.payload;
    })
    .addCase(updateDefaultAlertingAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    });
});

export * from './actions';
export * from './effects';
