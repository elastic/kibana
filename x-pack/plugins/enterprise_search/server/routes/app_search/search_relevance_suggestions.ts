/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { skipBodyValidation } from '../../lib/route_config_helpers';

import { RouteDependencies } from '../../plugin';

export function registerSearchRelevanceSuggestionsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/engines/{engineName}/search_relevance_suggestions',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: schema.object({
          page: schema.object({
            current: schema.number(),
            size: schema.number(),
          }),
          filters: schema.object({
            status: schema.arrayOf(schema.string()),
            type: schema.string(),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:engineName/search_relevance_suggestions',
    })
  );

  router.put(
    skipBodyValidation({
      path: '/internal/app_search/engines/{engineName}/search_relevance_suggestions',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:engineName/search_relevance_suggestions',
    })
  );

  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/search_relevance_suggestions/settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:engineName/search_relevance_suggestions/settings',
    })
  );

  router.put(
    skipBodyValidation({
      path: '/internal/app_search/engines/{engineName}/search_relevance_suggestions/settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v0/engines/:engineName/search_relevance_suggestions/settings',
    })
  );

  router.post(
    {
      path: '/internal/app_search/engines/{engineName}/search_relevance_suggestions/{query}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          query: schema.string(),
        }),
        query: schema.object({
          type: schema.string(),
        }),
      },
    },
    // enterpriseSearchRequestHandler.createRequest({
    //   path: '/as/engines/:engineName/search_relevance_suggestions/:query',
    // })
    (_context, request, response) => {
      return response.custom({
        statusCode: 200,
        body: {
          query: 'foo',
          status: 'pending',
          updated_at: '2021-07-08T14:35:50Z',
          operation: 'create',
          suggestion: {
            promoted: [
              {
                id: '1',
              },
              {
                id: '2',
              },
              {
                id: '3',
              },
            ],
            organic: [
              {
                id: {
                  raw: '1',
                },
                _meta: {
                  id: '1',
                  engine: 'some-engine',
                },
              },
              {
                id: {
                  raw: '2',
                },
                _meta: {
                  id: '2',
                  engine: 'some-engine',
                },
              },
            ],
          },
          curation: {
            id: 'cur-6155e69c7a2f2e4f756303fd',
            queries: ['foo'],
            promoted: [
              {
                id: '5',
              },
            ],
            hidden: [],
            last_updated: 'September 30, 2021 at 04:32PM',
            organic: [
              {
                id: {
                  raw: '1',
                },
                _meta: {
                  id: '1',
                  engine: 'some-engine',
                },
              },
            ],
          },
        },
      });
    }
  );
}
