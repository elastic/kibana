/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import {
  getDynamicSettings,
  getDynamicSettingsSuccess,
  getDynamicSettingsFail,
  setDynamicSettings,
  setDynamicSettingsSuccess,
  setDynamicSettingsFail,
} from '../actions/dynamic_settings';
import { DynamicSettings } from '../../../common/runtime_types';

export interface DynamicSettingsState {
  settings?: DynamicSettings;
  loadError?: Error;
  saveError?: Error;
  loading: boolean;
}

const initialState: DynamicSettingsState = {
  loading: true,
};

export const dynamicSettingsReducer = handleActions<DynamicSettingsState, any>(
  {
    [String(getDynamicSettings)]: (state) => ({
      ...state,
      loading: true,
    }),
    [String(getDynamicSettingsSuccess)]: (_state, action: Action<DynamicSettings>) => ({
      loading: false,
      settings: action.payload,
    }),
    [String(getDynamicSettingsFail)]: (_state, action: Action<Error>) => ({
      loading: false,
      loadError: action.payload,
    }),
    [String(setDynamicSettings)]: (state) => ({
      ...state,
      loading: true,
    }),
    [String(setDynamicSettingsSuccess)]: (_state, action: Action<DynamicSettings>) => ({
      settings: action.payload,
      saveSucceded: true,
      loading: false,
    }),
    [String(setDynamicSettingsFail)]: (state, action: Action<Error>) => ({
      ...state,
      loading: false,
      saveSucceeded: false,
      saveError: action.payload,
    }),
  },
  initialState
);
