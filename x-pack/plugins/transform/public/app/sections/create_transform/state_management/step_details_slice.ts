/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { createFormSlice } from '@kbn/ml-form-utils/form_slice';

import { validators } from '../../edit_transform/state_management/validators';

import {
  getDefaultStepDetailsState,
  getDefaultStepDetailsFormState,
  type StepDetailsState,
} from '../components/step_details';

export const stepDetailsFormSlice = createFormSlice(
  'stepDetailsForm',
  getDefaultStepDetailsFormState,
  validators
);

export const stepDetailsSlice = createSlice({
  name: 'stepDetails',
  initialState: getDefaultStepDetailsState(),
  reducers: {
    setStepDetailsState: (_, action: PayloadAction<StepDetailsState>) => action.payload,
    setDestinationIngestPipeline: (state, action: PayloadAction<string>) => {
      state.destinationIngestPipeline = action.payload;
    },
    setCreateDataView: (state, action: PayloadAction<boolean>) => {
      state.createDataView = action.payload;
    },
    setDataViewTimeField: (state, action: PayloadAction<string | undefined>) => {
      state.dataViewTimeField = action.payload;
    },
    setContinuousModeEnabled: (state, action: PayloadAction<boolean>) => {
      state.isContinuousModeEnabled = action.payload;
    },
    setContinuousModeDelay: (state, action: PayloadAction<string>) => {
      state.continuousModeDelay = action.payload;
    },
    setContinuousModeDateField: (state, action: PayloadAction<string>) => {
      state.continuousModeDateField = action.payload;
    },
    setRetentionPolicyEnabled: (state, action: PayloadAction<boolean>) => {
      state.isRetentionPolicyEnabled = action.payload;
    },
    setRetentionPolicyDateField: (state, action: PayloadAction<string>) => {
      state.retentionPolicyDateField = action.payload;
    },
    setRetentionPolicyMaxAge: (state, action: PayloadAction<string>) => {
      state.retentionPolicyMaxAge = action.payload;
    },
    setTransformFrequency: (state, action: PayloadAction<string>) => {
      state.transformFrequency = action.payload;
    },
    setTransformSettingsMaxPageSearchSize: (
      state,
      action: PayloadAction<StepDetailsState['transformSettingsMaxPageSearchSize']>
    ) => {
      state.transformSettingsMaxPageSearchSize = action.payload;
    },
    setTransformSettingsDocsPerSecond: (state, action: PayloadAction<number>) => {
      state.transformSettingsDocsPerSecond = action.payload;
    },
    setTransformSettingsNumFailureRetries: (
      state,
      action: PayloadAction<StepDetailsState['transformSettingsNumFailureRetries']>
    ) => {
      state.transformSettingsNumFailureRetries = action.payload;
    },
    setValid: (state, action: PayloadAction<boolean>) => {
      state.valid = action.payload;
    },
  },
});
