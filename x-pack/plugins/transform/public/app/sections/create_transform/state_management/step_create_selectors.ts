/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { StoreState } from './create_transform_store';

import { getCreateTransformRequestBody } from '../../../common';

import { selectPreviewRequest } from './step_define_selectors';

export const selectCreateTransformRequestBody = createSelector(
  [
    selectPreviewRequest,
    (state: StoreState) => state.stepDetails,
    (state: StoreState) => state.stepDetailsForm,
  ],
  (previewRequest, stepDetailsState, stepDetailsForm) =>
    getCreateTransformRequestBody(previewRequest, stepDetailsState, stepDetailsForm)
);
