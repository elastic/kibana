/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerEnginesRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/engines',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          q: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 1 }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({ path: '/api/engines' })
  );

  router.get(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({ path: '/api/engines/:engine_name' })
  );

  router.put(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
          name: schema.maybe(schema.string()),
        }),
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({ path: '/api/engines/:engine_name' })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/engines/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      hasJsonResponse: false,
      path: '/api/engines/:engine_name',
    })
  );
}
