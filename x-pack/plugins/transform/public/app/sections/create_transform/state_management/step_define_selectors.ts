/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { DataView } from '@kbn/data-views-plugin/common';

import { TRANSFORM_FUNCTION } from '../../../../../common/constants';
import { dictionaryToArray } from '../../../../../common/types/common';

import { validatePivotConfig } from '../components/step_define/hooks/use_pivot_config';
import {
  latestConfigMapper,
  validateLatestConfig,
} from '../components/step_define/hooks/use_latest_function_config';

import type { StoreState } from './create_transform_store';

import {
  getPreviewTransformRequestBody,
  getRequestPayload,
  getTransformConfigQuery,
} from '../../../common';

export const selectPivotRequestPayload = createSelector(
  [
    (state: StoreState) => state.stepDefine.aggList,
    (state: StoreState) => state.stepDefine.groupByList,
  ],
  (aggList, groupByList) =>
    getRequestPayload(dictionaryToArray(aggList), dictionaryToArray(groupByList))
);

export const selectPivotValidationStatus = createSelector(
  selectPivotRequestPayload,
  (requestPayload) => validatePivotConfig(requestPayload.pivot)
);

export const selectLatestRequestPayload = createSelector(
  (state: StoreState) => state.stepDefine.latestConfig,
  (config) => {
    const latest = latestConfigMapper.toAPIConfig(config);
    return latest ? { latest } : undefined;
  }
);

export const selectLatestValidationStatus = createSelector(
  selectLatestRequestPayload,
  (requestPayload) => validateLatestConfig(requestPayload?.latest)
);

export const selectValidatedRequestPayload = createSelector(
  [
    selectPivotRequestPayload,
    selectPivotValidationStatus,
    selectLatestRequestPayload,
    selectLatestValidationStatus,
    (state: StoreState) => state.stepDefine.transformFunction,
  ],
  (
    pivotRequestPayload,
    pivotValidationStatus,
    latestRequestPayload,
    latestValidationStatus,
    transformFunction
  ) => {
    return transformFunction === TRANSFORM_FUNCTION.PIVOT
      ? { requestPayload: pivotRequestPayload, validationStatus: pivotValidationStatus }
      : { requestPayload: latestRequestPayload, validationStatus: latestValidationStatus };
  }
);

export const selectTransformConfigQuery = createSelector(
  (state: StoreState) => state.stepDefine.searchQuery,
  (s) => getTransformConfigQuery(s)
);

export const selectCopyToClipboardPreviewRequest = createSelector(
  [
    (_: StoreState, dataView: DataView) => dataView,
    selectTransformConfigQuery,
    selectPivotRequestPayload,
    (state: StoreState) => state.advancedRuntimeMappingsEditor.runtimeMappings,
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
