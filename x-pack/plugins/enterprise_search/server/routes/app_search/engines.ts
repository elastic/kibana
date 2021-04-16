/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

interface EnginesResponse {
  results: object[];
  meta: { page: { total_results: number } };
}

export function registerEnginesRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines',
      validate: {
        query: schema.object({
          type: schema.oneOf([schema.literal('indexed'), schema.literal('meta')]),
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/as/engines/collection',
        hasValidData: (body?: EnginesResponse) =>
          Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number',
      })(context, request, response);
    }
  );

  router.post(
    {
      path: '/api/app_search/engines',
      validate: {
        body: schema.object({
          name: schema.string(),
          language: schema.maybe(schema.string()),
          source_engines: schema.maybe(schema.arrayOf(schema.string())),
          type: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/collection',
    })
  );

  // Single engine endpoints
  router.get(
    {
      path: '/api/app_search/engines/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name/details',
    })
  );
  router.delete(
    {
      path: '/api/app_search/engines/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name',
    })
  );
  router.get(
    {
      path: '/api/app_search/engines/{name}/overview',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:name/overview_metrics',
    })
  );
  router.get(
    {
      path: '/api/app_search/engines/{name}/source_engines',
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
}
