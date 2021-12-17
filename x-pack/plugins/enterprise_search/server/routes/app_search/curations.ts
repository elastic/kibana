/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerCurationsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/curations',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/collection',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{engineName}/curations',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: schema.object({
          queries: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/collection',
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          curationId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/:curationId',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      validate: {
        query: schema.object({
          skip_record_analytics: schema.string(),
        }),
        params: schema.object({
          engineName: schema.string(),
          curationId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/:curationId',
    })
  );

  router.put(
    {
      path: '/internal/app_search/engines/{engineName}/curations/{curationId}',
      validate: {
        query: schema.object({
          skip_record_analytics: schema.string(),
        }),
        params: schema.object({
          engineName: schema.string(),
          curationId: schema.string(),
        }),
        body: schema.object({
          query: schema.string(),
          queries: schema.arrayOf(schema.string()),
          promoted: schema.arrayOf(schema.string()),
          hidden: schema.arrayOf(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/:curationId',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/curations/find_or_create',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        query: schema.object({
          query: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/curations/find_or_create',
    })
  );
}
