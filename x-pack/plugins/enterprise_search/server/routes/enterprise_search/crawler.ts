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
  router.post(
    {
      path: '/internal/enterprise_search/crawler',
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
    })
  );
}
