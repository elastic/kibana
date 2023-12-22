/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';

export enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

interface CreateTransformWizardAppContextState {
  dataView: DataView | null;
  runtimeMappings: RuntimeMappings | undefined;
  currentStep: WIZARD_STEPS;
}
const createTransformWizardAppContextSlice = createSlice({
  name: 'createTransformWizardAppContext',
  initialState: {
    dataView: null,
    runtimeMappings: undefined,
    currentStep: WIZARD_STEPS.DEFINE,
  } as CreateTransformWizardAppContextState,
  reducers: {
    initialize: (
      state,
      action: PayloadAction<
        Pick<CreateTransformWizardAppContextState, 'dataView' | 'runtimeMappings'>
      >
    ) => {
      state.dataView = action.payload.dataView;
      state.runtimeMappings = action.payload.runtimeMappings;
    },
    setCurrentStep: (state, action: PayloadAction<WIZARD_STEPS>) => {
      state.currentStep = action.payload;
    },
  },
});

export const createTransformStore = configureStore({
  reducer: {
    wizard: createTransformWizardAppContextSlice.reducer,
  },
});

interface StoreState {
  wizard: CreateTransformWizardAppContextState;
}

export function useCreateTransformWizardActions() {
  const dispatch = useDispatch();
  return bindActionCreators(createTransformWizardAppContextSlice.actions, dispatch);
}

export function useCreateTransformWizardSelector<T>(selector: (s: StoreState) => T) {
  return useSelector<StoreState, T>(selector);
}
