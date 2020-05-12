/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { UIM_SNAPSHOT_DELETE, UIM_SNAPSHOT_DELETE_MANY } from '../../constants';
import { UiMetricService } from '../ui_metric';
import { sendRequest, useRequest } from './use_request';

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService;
export const setUiMetricServiceSnapshot = (_uiMetricService: UiMetricService) => {
  uiMetricService = _uiMetricService;
};
// End hack

export const useLoadSnapshots = () =>
  useRequest({
    path: `${API_BASE_PATH}snapshots`,
    method: 'get',
    initialData: [],
  });

export const useLoadSnapshot = (repositoryName: string, snapshotId: string) =>
  useRequest({
    path: `${API_BASE_PATH}snapshots/${encodeURIComponent(repositoryName)}/${encodeURIComponent(
      snapshotId
    )}`,
    method: 'get',
  });

export const deleteSnapshots = async (
  snapshotIds: Array<{ snapshot: string; repository: string }>
) => {
  const result = await sendRequest({
    path: `${API_BASE_PATH}snapshots/bulk_delete`,
    method: 'post',
    body: snapshotIds,
  });

  uiMetricService.trackUiMetric(
    snapshotIds.length > 1 ? UIM_SNAPSHOT_DELETE_MANY : UIM_SNAPSHOT_DELETE
  );
  return result;
};
