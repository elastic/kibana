/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

export interface WizardState {
  currentStep: WIZARD_STEPS;
}

export const wizardSlice = createSlice({
  name: 'createTransformWizardAppContext',
  initialState: {
    currentStep: WIZARD_STEPS.DEFINE,
  } as WizardState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<WIZARD_STEPS>) => {
      state.currentStep = action.payload;
    },
  },
});
