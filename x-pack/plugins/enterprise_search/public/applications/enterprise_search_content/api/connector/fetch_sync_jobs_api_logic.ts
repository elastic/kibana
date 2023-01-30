/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorSyncJob } from '../../../../../common/types/connectors';
import { Paginate } from '../../../../../common/types/pagination';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchSyncJobsArgs {
  connectorId: string;
  from?: number;
  size?: number;
}

export type FetchSyncJobsResponse = Paginate<ConnectorSyncJob>;

export const fetchSyncJobs = async ({ connectorId, from = 0, size = 10 }: FetchSyncJobsArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/sync_jobs`;
  const query = { from, size };
  return await HttpLogic.values.http.get<Paginate<ConnectorSyncJob>>(route, { query });
};

export const FetchSyncJobsApiLogic = createApiLogic(
  ['enterprise_search_content', 'fetch_sync_api_logic'],
  fetchSyncJobs
);
