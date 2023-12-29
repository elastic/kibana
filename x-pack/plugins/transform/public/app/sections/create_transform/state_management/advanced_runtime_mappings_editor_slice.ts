/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';

export interface AdvancedRuntimeMappingsEditorState {
  advancedRuntimeMappingsConfig: string;
  advancedRuntimeMappingsConfigLastApplied: string;
  isRuntimeMappingsEditorApplyButtonEnabled: boolean;
  isRuntimeMappingsEditorEnabled: boolean;
  isRuntimeMappingsEditorSwitchModalVisible: boolean;
  runtimeMappings?: RuntimeMappings;
  runtimeMappingsUpdated: boolean;
}

const getAdvancedRuntimeMappingsEditorInitialState = (): AdvancedRuntimeMappingsEditorState => ({
  advancedRuntimeMappingsConfig: '',
  advancedRuntimeMappingsConfigLastApplied: '',
  isRuntimeMappingsEditorApplyButtonEnabled: false,
  isRuntimeMappingsEditorEnabled: false,
  isRuntimeMappingsEditorSwitchModalVisible: false,
  runtimeMappingsUpdated: false,
});

export const advancedRuntimeMappingsEditorSlice = createSlice({
  name: 'advancedRuntimeMappingsEditor',
  initialState: getAdvancedRuntimeMappingsEditorInitialState(),
  reducers: {
    applyRuntimeMappingsEditorChanges: (state) => {
      const parsedRuntimeMappings =
        state.advancedRuntimeMappingsConfig === ''
          ? {}
          : JSON.parse(state.advancedRuntimeMappingsConfig);
      const prettySourceConfig = JSON.stringify(parsedRuntimeMappings, null, 2);
      state.runtimeMappingsUpdated = true;
      state.runtimeMappings = parsedRuntimeMappings;
      state.advancedRuntimeMappingsConfig = prettySourceConfig;
      state.advancedRuntimeMappingsConfigLastApplied = prettySourceConfig;
      state.isRuntimeMappingsEditorApplyButtonEnabled = false;
    },
    setRuntimeMappingsEditorSwitchModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isRuntimeMappingsEditorSwitchModalVisible = action.payload;
    },
    setRuntimeMappingsEditorApplyButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.isRuntimeMappingsEditorApplyButtonEnabled = action.payload;
    },
    setAdvancedRuntimeMappingsConfigLastApplied: (state, action: PayloadAction<string>) => {
      state.advancedRuntimeMappingsConfigLastApplied = action.payload;
    },
    setAdvancedRuntimeMappingsConfig: (state, action: PayloadAction<string>) => {
      state.advancedRuntimeMappingsConfig = action.payload;
    },
    setRuntimeMappingsUpdated: (state, action: PayloadAction<boolean>) => {
      state.runtimeMappingsUpdated = action.payload;
    },
    setRuntimeMappings: (
      state,
      action: PayloadAction<AdvancedRuntimeMappingsEditorState['runtimeMappings']>
    ) => {
      state.runtimeMappings = action.payload;
    },
    setRuntimeMappingsEditorEnabled: (state, action: PayloadAction<boolean>) => {
      state.isRuntimeMappingsEditorEnabled = action.payload;
    },
    toggleRuntimeMappingsEditor: (state, action: PayloadAction<boolean | undefined>) => {
      const reset = action.payload ?? false;
      if (reset === true) {
        state.runtimeMappingsUpdated = false;
        state.advancedRuntimeMappingsConfig = state.advancedRuntimeMappingsConfigLastApplied;
      }
      state.isRuntimeMappingsEditorEnabled = !state.isRuntimeMappingsEditorEnabled;
      state.isRuntimeMappingsEditorApplyButtonEnabled = false;
    },
  },
});
