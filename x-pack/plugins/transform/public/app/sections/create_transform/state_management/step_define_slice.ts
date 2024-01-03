/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type TransformFunction } from '../../../../../common/constants';

import {
  type PivotAggsConfigDict,
  type PivotGroupByConfigDict,
  type PivotAggsConfig,
  type PivotGroupByConfig,
} from '../../../common';

import type { StepDefineState } from '../components/step_define';
import { getDefaultStepDefineState } from '../components/step_define/common';

export const stepDefineSlice = createSlice({
  name: 'stepDefine',
  initialState: getDefaultStepDefineState(),
  reducers: {
    setAggList: (state, action: PayloadAction<PivotAggsConfigDict>) => {
      state.aggList = action.payload;
    },
    setDatePickerApplyEnabled: (state, action: PayloadAction<boolean>) => {
      state.isDatePickerApplyEnabled = action.payload;
    },
    setGroupByList: (state, action: PayloadAction<PivotGroupByConfigDict>) => {
      state.groupByList = action.payload;
    },
    setLatestFunctionConfigUniqueKey: (
      state,
      action: PayloadAction<StepDefineState['latestConfig']['unique_key']>
    ) => {
      state.latestConfig.unique_key = action.payload;
    },
    setLatestFunctionConfigSort: (
      state,
      action: PayloadAction<StepDefineState['latestConfig']['sort']>
    ) => {
      state.latestConfig.sort = action.payload;
    },
    setSearchLanguage: (state, action: PayloadAction<StepDefineState['searchLanguage']>) => {
      state.searchLanguage = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<StepDefineState['searchQuery']>) => {
      state.searchQuery = action.payload;
    },
    setSearchString: (state, action: PayloadAction<string | undefined>) => {
      state.searchString = action.payload;
    },
    setStepDefineState: (_, action: PayloadAction<StepDefineState>) => action.payload,
    setTimeRangeMs: (state, action: PayloadAction<StepDefineState['timeRangeMs']>) => {
      state.timeRangeMs = action.payload;
    },
    setTransformFunction: (state, action: PayloadAction<TransformFunction>) => {
      state.transformFunction = action.payload;
    },
    rAddAggregation: (
      state,
      action: PayloadAction<{ aggName: string; config: PivotAggsConfig }>
    ) => {
      state.aggList[action.payload.aggName] = action.payload.config;
    },
    rDeleteAggregation: (state, action: PayloadAction<string>) => {
      delete state.aggList[action.payload];
    },
    rUpdateAggregation: (
      state,
      action: PayloadAction<{ previousAggName: string; config: PivotAggsConfig }>
    ) => {
      delete state.aggList[action.payload.previousAggName];
      state.aggList[action.payload.config.aggName] = action.payload.config;
    },
    rAddGroupBy: (
      state,
      action: PayloadAction<{ aggName: string; config: PivotGroupByConfig }>
    ) => {
      state.groupByList[action.payload.aggName] = action.payload.config;
    },
    rDeleteGroupBy: (state, action: PayloadAction<string>) => {
      delete state.groupByList[action.payload];
    },
  },
});
