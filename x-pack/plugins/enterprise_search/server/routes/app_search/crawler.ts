/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerCrawlerRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{name}/crawler',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:name/crawler',
    })
  );

  router.delete(
    {
      path: '/api/app_search/engines/{name}/crawler/domains/{id}',
      validate: {
        params: schema.object({
          name: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          respond_with: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:name/crawler/domains/:id',
    })
  );
}
