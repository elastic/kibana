/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { MINIMUM_TIMEOUT_MS, UIM_SNAPSHOT_DELETE, UIM_SNAPSHOT_DELETE_MANY } from '../../constants';
import { httpService } from './http';
import { sendRequest, useRequest } from './use_request';

export const loadSnapshots = () =>
  useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}snapshots`),
    method: 'get',
    initialData: [],
    timeout: MINIMUM_TIMEOUT_MS,
  });

export const loadSnapshot = (repositoryName: string, snapshotId: string) =>
  useRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}snapshots/${encodeURIComponent(repositoryName)}/${encodeURIComponent(
        snapshotId
      )}`
    ),
    method: 'get',
  });

export const deleteSnapshots = async (snapshotIds: string[]) => {
  return sendRequest({
    path: httpService.addBasePath(
      `${API_BASE_PATH}snapshots/${snapshotIds
        .map(snapshotId => encodeURIComponent(snapshotId))
        .join(',')}`
    ),
    method: 'delete',
    uimActionType: snapshotIds.length > 1 ? UIM_SNAPSHOT_DELETE_MANY : UIM_SNAPSHOT_DELETE,
  });
};
