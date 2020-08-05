/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import rison from 'rison-node';

import { getBasePath } from './dependency_cache';

export function getJobIdUrl(tabId: string, jobId: string): string {
  // Create url for filtering by job id for kibana management table
  const settings = {
    jobId,
  };
  const encoded = rison.encode(settings);
  const url = `?mlManagement=${encoded}`;
  const basePath = getBasePath();

  return `${basePath.get()}/app/ml#/${tabId}${url}`;
}

export function getGroupIdsUrl(tabId: string, groupIds: string[]): string {
  // Create url for filtering by group id(s) for kibana management table
  // format: mlManagement=(groupIds:!(first_group_id,second_group_id))
  const settings = {
    groupIds,
  };
  const encoded = rison.encode(settings);
  const url = `?mlManagement=${encoded}`;
  const basePath = getBasePath();

  return `${basePath.get()}/app/ml#/${tabId}${url}`;
}
