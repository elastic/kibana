/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { TransformId } from '../../../../../common/types/transform';
import type { EsIndexName } from '../components/step_details/common';

import {
  getDefaultStepDetailsState,
  type StepDetailsExposedState,
} from '../components/step_details';

export const stepDetailsSlice = createSlice({
  name: 'stepDetails',
  initialState: getDefaultStepDetailsState(),
  reducers: {
    setStepDetailsState: (_, action: PayloadAction<StepDetailsExposedState>) => action.payload,
    setTransformId: (state, action: PayloadAction<TransformId>) => {
      state.transformId = action.payload;
    },
    setTransformDescription: (state, action: PayloadAction<string>) => {
      state.transformDescription = action.payload;
    },
    setDestinationIndex: (state, action: PayloadAction<EsIndexName>) => {
      state.destinationIndex = action.payload;
    },
    setDestinationIngestPipeline: (state, action: PayloadAction<string>) => {
      state.destinationIngestPipeline = action.payload;
    },
  },
});
