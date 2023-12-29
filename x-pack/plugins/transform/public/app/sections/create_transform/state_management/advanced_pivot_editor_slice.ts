/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AdvancedPivotEditorState {
  config: string;
  advancedEditorConfig: string;
  advancedEditorConfigLastApplied: string;
  isEnabled: boolean;
  isAdvancedEditorSwitchModalVisible: boolean;
  isAdvancedPivotEditorEnabled: boolean;
  isAdvancedPivotEditorApplyButtonEnabled: boolean;
  xJsonMode: any;
}

const getAdvancedPivotEditorInitialState = (): AdvancedPivotEditorState => ({
  config: '',
  advancedEditorConfig: '',
  advancedEditorConfigLastApplied: '',
  isEnabled: false,
  isAdvancedEditorSwitchModalVisible: false,
  isAdvancedPivotEditorEnabled: false,
  isAdvancedPivotEditorApplyButtonEnabled: false,
  xJsonMode: null,
});

export const advancedPivotEditorSlice = createSlice({
  name: 'advancedPivotEditorSlice',
  initialState: getAdvancedPivotEditorInitialState(),
  reducers: {
    setAdvancedEditorSwitchModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedEditorSwitchModalVisible = action.payload;
    },
    setAdvancedPivotEditorApplyButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedPivotEditorApplyButtonEnabled = action.payload;
    },
    setAdvancedEditorConfig: (state, action: PayloadAction<string>) => {
      state.advancedEditorConfig = action.payload;
    },
    setAdvancedEditorConfigLastApplied: (state, action: PayloadAction<string>) => {
      state.advancedEditorConfigLastApplied = action.payload;
    },
    toggleAdvancedEditor: (state) => {
      if (state.isAdvancedPivotEditorEnabled === false) {
        state.advancedEditorConfigLastApplied = state.advancedEditorConfig;
      }
      state.isAdvancedPivotEditorEnabled = !state.isAdvancedPivotEditorEnabled;
      state.isAdvancedPivotEditorApplyButtonEnabled = false;
    },
  },
});
