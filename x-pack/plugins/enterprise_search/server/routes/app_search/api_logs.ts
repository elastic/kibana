/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerApiLogsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/api_logs',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        query: schema.object({
          'filters[date][from]': schema.string(), // Date string, expected format: ISO string
          'filters[date][to]': schema.string(), // Date string, expected format: ISO string
          'page[current]': schema.number(),
          sort_direction: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/api_logs/collection',
    })
  );
}
