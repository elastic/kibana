/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerStatsRoutes({
  enterpriseSearchRequestHandler,
  log,
  router,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/stats/cloud_health',
      validate: {},
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const MIN_MEMORY = 1289748481;
      const entSearchResponse = await enterpriseSearchRequestHandler.createRequest({
        path: '/api/ent/v1/internal/health',
      })(context, request, response);
      const hasMinConnectorMemory =
        entSearchResponse.payload?.jvm?.memory_usage?.heap_max > MIN_MEMORY;
      return response.ok({
        body: { has_min_connector_memory: hasMinConnectorMemory },
      });
    })
  );
}
