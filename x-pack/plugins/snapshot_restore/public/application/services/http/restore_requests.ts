/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { RestoreSettings } from '../../../../common/types';
import { UIM_RESTORE_CREATE } from '../../constants';
import { UiMetricService } from '../ui_metric';
import { sendRequest, useRequest } from './use_request';

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService;
export const setUiMetricServiceRestore = (_uiMetricService: UiMetricService) => {
  uiMetricService = _uiMetricService;
};
// End hack

export const executeRestore = async (
  repository: string,
  snapshot: string,
  restoreSettings: RestoreSettings
) => {
  const result = await sendRequest({
    path: `${API_BASE_PATH}restore/${encodeURIComponent(repository)}/${encodeURIComponent(
      snapshot
    )}`,
    method: 'post',
    body: restoreSettings,
  });

  uiMetricService.trackUiMetric(UIM_RESTORE_CREATE);
  return result;
};

export const useLoadRestores = (pollIntervalMs?: number) => {
  return useRequest({
    path: `${API_BASE_PATH}restores`,
    method: 'get',
    initialData: [],
    pollIntervalMs,
  });
};
