/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdvancedSourceEditorState {
  advancedSourceEditorConfig: string;
  advancedSourceEditorConfigLastApplied: string;
  isAdvancedSourceEditorApplyButtonEnabled: boolean;
  isAdvancedSourceEditorEnabled: boolean;
  isAdvancedSourceEditorSwitchModalVisible: boolean;
  sourceConfigUpdated: boolean;
}

const getAdvancedSourceEditorInitialState = (): AdvancedSourceEditorState => ({
  advancedSourceEditorConfig: '',
  advancedSourceEditorConfigLastApplied: '',
  isAdvancedSourceEditorApplyButtonEnabled: false,
  isAdvancedSourceEditorEnabled: false,
  isAdvancedSourceEditorSwitchModalVisible: false,
  sourceConfigUpdated: false,
});

export const advancedSourceEditorSlice = createSlice({
  name: 'advancedSourceEditor',
  initialState: getAdvancedSourceEditorInitialState(),
  reducers: {
    applyAdvancedSourceEditorChanges: (state) => {
      const sourceConfig = JSON.parse(state.advancedSourceEditorConfig);
      const prettySourceConfig = JSON.stringify(sourceConfig, null, 2);
      state.sourceConfigUpdated = true;
      state.advancedSourceEditorConfig = prettySourceConfig;
      state.advancedSourceEditorConfigLastApplied = prettySourceConfig;
      state.isAdvancedSourceEditorApplyButtonEnabled = false;
    },
    setAdvancedSourceEditorEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedSourceEditorEnabled = action.payload;
    },
    setAdvancedSourceEditorSwitchModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedSourceEditorSwitchModalVisible = action.payload;
    },
    setAdvancedSourceEditorApplyButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedSourceEditorApplyButtonEnabled = action.payload;
    },
    setAdvancedSourceEditorConfigLastApplied: (state, action: PayloadAction<string>) => {
      state.advancedSourceEditorConfigLastApplied = action.payload;
    },
    setAdvancedSourceEditorConfig: (state, action: PayloadAction<string>) => {
      state.advancedSourceEditorConfig = action.payload;
    },
    setSourceConfigUpdated: (state, action: PayloadAction<boolean>) => {
      state.sourceConfigUpdated = action.payload;
    },
    // If switching to KQL after updating via editor - reset search
    toggleAdvancedSourceEditor: (state, action: PayloadAction<boolean | undefined>) => {
      const reset = action.payload ?? false;
      if (reset === true) {
        state.sourceConfigUpdated = false;
      }
      if (state.isAdvancedSourceEditorEnabled === false) {
        state.advancedSourceEditorConfigLastApplied = state.advancedSourceEditorConfig;
      }

      state.isAdvancedSourceEditorEnabled = !state.isAdvancedSourceEditorEnabled;
      state.isAdvancedSourceEditorApplyButtonEnabled = false;
    },
  },
});
