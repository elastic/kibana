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

function getSelectedIdsUrl(tabId: TAB_IDS, settings: { [key: string]: string | string[] }): string {
  // Create url for filtering by job id or group ids for kibana management table
  const encoded = rison.encode(settings);
  const url = `?mlManagement=${encoded}`;
  const basePath = getBasePath();

  return `${basePath.get()}/app/ml#/${tabId}${url}`;
}

// Create url for filtering by group ids for kibana management table
export function getGroupIdsUrl(tabId: TAB_IDS, ids: string[]): string {
  const settings = {
    groupIds: ids,
  };

  return getSelectedIdsUrl(tabId, settings);
}

// Create url for filtering by job id for kibana management table
export function getJobIdUrl(tabId: TAB_IDS, id: string): string {
  const settings = {
    jobId: id,
  };

  return getSelectedIdsUrl(tabId, settings);
}
