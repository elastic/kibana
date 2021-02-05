/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const querySchema = {
  start: schema.maybe(schema.string()), // Date string, expected format 'YYYY-MM-DD'
  end: schema.maybe(schema.string()), // Date string, expected format 'YYYY-MM-DD'
  tag: schema.maybe(schema.string()),
};
const queriesSchema = {
  ...querySchema,
  size: schema.maybe(schema.number()),
};

export function registerAnalyticsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/analytics/queries',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        query: schema.object(queriesSchema),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/analytics/queries',
    })
  );

  router.get(
    {
      path: '/api/app_search/engines/{engineName}/analytics/queries/{query}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          query: schema.string(),
        }),
        query: schema.object(querySchema),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/analytics/query/:query',
    })
  );
}
