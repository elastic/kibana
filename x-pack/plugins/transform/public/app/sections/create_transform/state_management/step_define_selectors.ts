/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { DataView } from '@kbn/data-views-plugin/common';

import { dictionaryToArray } from '../../../../../common/types/common';

import { validatePivotConfig } from '../components/step_define/hooks/use_pivot_config';

import type { StoreState } from './create_transform_store';

import {
  getPreviewTransformRequestBody,
  getRequestPayload,
  getTransformConfigQuery,
} from '../../../common';

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
  (s) => getTransformConfigQuery(s)
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
