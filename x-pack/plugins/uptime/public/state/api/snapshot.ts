/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotType, Snapshot } from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

export interface SnapShotQueryParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

export const fetchSnapshotCount = async ({
  dateRangeStart,
  dateRangeEnd,
  filters,
  statusFilter,
}: SnapShotQueryParams): Promise<Snapshot> => {
  const queryParams = {
    dateRangeStart,
    dateRangeEnd,
    ...(filters && { filters }),
    ...(statusFilter && { statusFilter }),
  };

  return await apiService.get(API_URLS.SNAPSHOT_COUNT, queryParams, SnapshotType);
};
