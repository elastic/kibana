/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface StepCreateState {
  created: boolean;
  started: boolean;
  dataViewId?: string;
}

const getDefaultStepCreateState = (): StepCreateState => ({
  created: false,
  started: false,
  dataViewId: undefined,
});

export const stepCreateSlice = createSlice({
  name: 'stepCreate',
  initialState: getDefaultStepCreateState(),
  reducers: {
    setStepCreateState: (_, action: PayloadAction<StepCreateState>) => action.payload,
    setCreated: (state, action: PayloadAction<boolean>) => {
      state.created = action.payload;
    },
    setStarted: (state, action: PayloadAction<boolean>) => {
      state.started = action.payload;
    },
    setDataViewId: (state, action: PayloadAction<string>) => {
      state.dataViewId = action.payload;
    },
  },
});
