/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';

import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { useToastNotifications } from '../../app_dependencies';
import {
  getPivotConfigActions,
  usePivotConfigOptions,
} from './components/step_define/hooks/use_pivot_config';

import type {
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotAggsConfig,
  PivotGroupByConfig,
} from '../../common';

import type { StepDefineExposedState } from './components/step_define';
import { getDefaultStepDefineState } from './components/step_define/common';
import type { StepDetailsExposedState } from './components/step_details';

export enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

interface CreateTransformWizardAppContextState {
  runtimeMappings: RuntimeMappings | undefined;
  currentStep: WIZARD_STEPS;
}
const createTransformWizardAppContextSlice = createSlice({
  name: 'createTransformWizardAppContext',
  initialState: {
    searchItems: undefined,
    runtimeMappings: undefined,
    currentStep: WIZARD_STEPS.DEFINE,
  } as CreateTransformWizardAppContextState,
  reducers: {
    initializeAppContext: (
      state,
      action: PayloadAction<Pick<CreateTransformWizardAppContextState, 'runtimeMappings'>>
    ) => {
      state.runtimeMappings = action.payload.runtimeMappings;
    },
    setCurrentStep: (state, action: PayloadAction<WIZARD_STEPS>) => {
      state.currentStep = action.payload;
    },
  },
});

export const stepDefineSlice = createSlice({
  name: 'stepDefine',
  initialState: getDefaultStepDefineState(),
  reducers: {
    setAggList: (state, action: PayloadAction<PivotAggsConfigDict>) => {
      state.aggList = action.payload;
    },
    setGroupByList: (state, action: PayloadAction<PivotGroupByConfigDict>) => {
      state.groupByList = action.payload;
    },
    setStepDefineState: (_, action: PayloadAction<StepDefineExposedState>) => action.payload,
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

const stepDetailsSlice = createSlice({
  name: 'stepDetails',
  initialState: null as StepDetailsExposedState | null,
  reducers: {
    setStepDetailsState: (_, action: PayloadAction<StepDetailsExposedState>) => action.payload,
  },
});

export const getTransformWizardStore = () =>
  configureStore({
    reducer: {
      wizard: createTransformWizardAppContextSlice.reducer,
      stepDefine: stepDefineSlice.reducer,
      stepDetails: stepDetailsSlice.reducer,
    },
  });

export interface StoreState {
  wizard: CreateTransformWizardAppContextState;
  stepDefine: StepDefineExposedState;
  stepDetails: StepDetailsExposedState | null;
}

export function useCreateTransformWizardActions() {
  const pivotConfigOptions = usePivotConfigOptions();
  const toastNotifications = useToastNotifications();
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      ...bindActionCreators(
        {
          ...createTransformWizardAppContextSlice.actions,
          ...stepDefineSlice.actions,
          ...stepDetailsSlice.actions,
        },
        dispatch
      ),
      pivotConfig: bindActionCreators(
        getPivotConfigActions(pivotConfigOptions, toastNotifications),
        dispatch
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

export function useCreateTransformWizardSelector<T>(selector: (s: StoreState) => T) {
  return useSelector<StoreState, T>(selector);
}
