/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerSourceEnginesRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/engines/{name}/source_engines',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name/source_engines',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{name}/source_engines/bulk_create',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({
          source_engine_slugs: schema.arrayOf(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name/source_engines/bulk_create',
      hasJsonResponse: false,
    })
  );

  router.delete(
    {
      path: '/internal/app_search/engines/{name}/source_engines/{source_engine_name}',
      validate: {
        params: schema.object({
          name: schema.string(),
          source_engine_name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name/source_engines/:source_engine_name',
      hasJsonResponse: false,
    })
  );
}
