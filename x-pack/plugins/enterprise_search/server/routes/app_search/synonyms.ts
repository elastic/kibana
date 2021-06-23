/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { skipBodyValidation } from '../../lib/route_config_helpers';
import { RouteDependencies } from '../../plugin';

export function registerSynonymsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/synonyms',
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
      path: '/as/engines/:engineName/synonyms/collection',
    })
  );

  router.post(
    skipBodyValidation({
      path: '/api/app_search/engines/{engineName}/synonyms',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/synonyms/collection',
    })
  );

  router.put(
    skipBodyValidation({
      path: '/api/app_search/engines/{engineName}/synonyms/{synonymId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          synonymId: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/synonyms/:synonymId',
    })
  );

  router.delete(
    {
      path: '/api/app_search/engines/{engineName}/synonyms/{synonymId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          synonymId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/synonyms/:synonymId',
    })
  );
}
