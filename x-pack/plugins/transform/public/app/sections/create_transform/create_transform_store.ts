/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { configureStore, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';

import type { DataView } from '@kbn/data-views-plugin/common';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { dictionaryToArray } from '../../../../common/types/common';
import { type TransformFunction, TRANSFORM_FUNCTION } from '../../../../common/constants';
import { useToastNotifications } from '../../app_dependencies';
import {
  getPivotConfigActions,
  usePivotConfigOptions,
  validatePivotConfig,
} from './components/step_define/hooks/use_pivot_config';

import {
  getPreviewTransformRequestBody,
  getRequestPayload,
  getTransformConfigQuery,
  type PivotAggsConfigDict,
  type PivotGroupByConfigDict,
  type PivotAggsConfig,
  type PivotGroupByConfig,
} from '../../common';

import {
  latestConfigMapper,
  validateLatestConfig,
} from './components/step_define/hooks/use_latest_function_config';
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
    setAdvancedPivotEditorEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedPivotEditorEnabled = action.payload;
    },
    setAdvancedSourceEditorEnabled: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedSourceEditorEnabled = action.payload;
    },
    setAggList: (state, action: PayloadAction<PivotAggsConfigDict>) => {
      state.aggList = action.payload;
    },
    setDatePickerApplyEnabled: (state, action: PayloadAction<boolean>) => {
      state.isDatePickerApplyEnabled = action.payload;
    },
    setGroupByList: (state, action: PayloadAction<PivotGroupByConfigDict>) => {
      state.groupByList = action.payload;
    },
    setLatestFunctionConfig: (
      state,
      action: PayloadAction<StepDefineExposedState['latestConfig']>
    ) => {
      state.latestConfig = action.payload as any;
    },
    setRuntimeMappings: (
      state,
      action: PayloadAction<StepDefineExposedState['runtimeMappings']>
    ) => {
      state.runtimeMappings = action.payload;
    },
    setRuntimeMappingsEditorEnabled: (
      state,
      action: PayloadAction<StepDefineExposedState['isRuntimeMappingsEditorEnabled']>
    ) => {
      state.isRuntimeMappingsEditorEnabled = action.payload;
    },
    setRuntimeMappingsUpdated: (
      state,
      action: PayloadAction<StepDefineExposedState['runtimeMappingsUpdated']>
    ) => {
      state.runtimeMappingsUpdated = action.payload;
    },
    setSearchLanguage: (state, action: PayloadAction<StepDefineExposedState['searchLanguage']>) => {
      state.searchLanguage = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<StepDefineExposedState['searchQuery']>) => {
      state.searchQuery = action.payload;
    },
    setSearchString: (state, action: PayloadAction<string | undefined>) => {
      state.searchString = action.payload;
    },
    setSourceConfigUpdated: (state, action: PayloadAction<boolean>) => {
      state.sourceConfigUpdated = action.payload;
    },
    setStepDefineState: (_, action: PayloadAction<StepDefineExposedState>) => action.payload,
    setTimeRangeMs: (state, action: PayloadAction<StepDefineExposedState['timeRangeMs']>) => {
      state.timeRangeMs = action.payload;
    },
    setTransformFunction: (state, action: PayloadAction<TransformFunction>) => {
      const pivotAggsArr = dictionaryToArray(state.aggList);
      const pivotGroupByArr = dictionaryToArray(state.groupByList);
      const pivotRequestPayload = getRequestPayload(pivotAggsArr, pivotGroupByArr);
      const pivotValidationStatus = validatePivotConfig(pivotRequestPayload.pivot);

      const latest = latestConfigMapper.toAPIConfig(state.latestConfig);
      const latestRequestPayload = latest ? { latest } : undefined;
      const latestValidationStatus = validateLatestConfig(latestRequestPayload?.latest);

      state.transformFunction = action.payload;
      state.valid =
        action.payload === TRANSFORM_FUNCTION.PIVOT
          ? pivotValidationStatus.isValid
          : latestValidationStatus.isValid;
      state.validationStatus =
        action.payload === TRANSFORM_FUNCTION.PIVOT
          ? pivotValidationStatus
          : latestValidationStatus;
      state.previewRequest =
        action.payload === TRANSFORM_FUNCTION.PIVOT ? pivotRequestPayload : latestRequestPayload;
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

export const selectRequestPayload = createSelector(
  [
    (state: StoreState) => state.stepDefine.aggList,
    (state: StoreState) => state.stepDefine.groupByList,
  ],
  (aggList, groupByList) =>
    getRequestPayload(dictionaryToArray(aggList), dictionaryToArray(groupByList))
);

export const selectPivotValidationStatus = createSelector(selectRequestPayload, (requestPayload) =>
  validatePivotConfig(requestPayload.pivot)
);

export const selectTransformConfigQuery = createSelector(
  (state: StoreState) => state.stepDefine.searchQuery,
  getTransformConfigQuery
);

export const selectCopyToClipboardPreviewRequest = createSelector(
  [
    (_: StoreState, dataView: DataView) => dataView,
    selectTransformConfigQuery,
    selectRequestPayload,
    (state: StoreState) => state.stepDefine.runtimeMappings,
    (state: StoreState) => state.stepDefine.isDatePickerApplyEnabled,
    (state: StoreState) => state.stepDefine.timeRangeMs,
  ],
  (
    dataView,
    transformConfigQuery,
    requestPayload,
    runtimeMappings,
    isDatePickerApplyEnabled,
    timeRangeMs
  ) =>
    getPreviewTransformRequestBody(
      dataView,
      transformConfigQuery,
      requestPayload,
      runtimeMappings,
      isDatePickerApplyEnabled ? timeRangeMs : undefined
    )
);

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
