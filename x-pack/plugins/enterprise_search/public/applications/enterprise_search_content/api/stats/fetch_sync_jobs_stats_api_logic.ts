/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyncJobsStats } from '../../../../../common/stats';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchSyncJobsStatsResponse = SyncJobsStats;

export const fetchSyncJobsStats = async () => {
  const route = '/internal/enterprise_search/stats/sync_jobs';
  return await HttpLogic.values.http.get<FetchSyncJobsStatsResponse>(route);
};

export const FetchSyncJobsStatsApiLogic = createApiLogic(
  ['enterprise_search_content', 'fetch_sync_jobs_stats_api_logic'],
  fetchSyncJobsStats
);
