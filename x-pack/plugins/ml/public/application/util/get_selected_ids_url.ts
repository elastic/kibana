/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import rison from 'rison-node';

import { getBasePath } from './dependency_cache';

export enum TAB_IDS {
  DATA_FRAME_ANALYTICS = 'data_frame_analytics',
  ANOMALY_DETECTION = 'jobs',
}

export function getSelectedIdsUrl(
  tabId: string,
  ids: string | string[],
  isGroup: boolean = false
): string {
  // Create url for filtering by job id or group ids for kibana management table
  const settings = {
    [isGroup ? 'groupIds' : 'jobId']: Array.isArray(ids) ? ids : [ids],
  };
  const encoded = rison.encode(settings);
  const url = `?mlManagement=${encoded}`;
  const basePath = getBasePath();

  return `${basePath.get()}/app/ml#/${tabId}${url}`;
}
