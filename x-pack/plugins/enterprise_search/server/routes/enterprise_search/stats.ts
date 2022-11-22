/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchSyncJobsStats } from '../../lib/stats/get_sync_jobs';
import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerStatsRoutes({ router, log }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/stats/sync_jobs',
      validate: {},
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const body = await fetchSyncJobsStats(client);
      return response.ok({ body });
    })
  );
}
