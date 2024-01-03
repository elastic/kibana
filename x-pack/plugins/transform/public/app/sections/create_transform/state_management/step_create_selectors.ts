/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { DataView } from '@kbn/data-views-plugin/common';

import type { StoreState } from './create_transform_store';

import { getCreateTransformRequestBody } from '../../../common';

export const selectCreateTransformRequestBody = createSelector(
  [
    (_: StoreState, dataView: DataView) => dataView,
    (state: StoreState) => state.stepDefine,
    (state: StoreState) => state.stepDetails,
    (state: StoreState) => state.advancedRuntimeMappingsEditor.runtimeMappings,
  ],
  (dataView, stepDefineState, stepDetailsState, runtimeMappings) =>
    getCreateTransformRequestBody(dataView, stepDefineState, stepDetailsState, runtimeMappings)
);
