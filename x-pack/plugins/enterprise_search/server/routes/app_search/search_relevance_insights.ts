/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { skipBodyValidation } from '../../lib/route_config_helpers';

import { RouteDependencies } from '../../plugin';

export function registerSearchRelevanceInsightsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/engines/{engineName}/search_relevance_insights/settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/search_relevance_insights/settings',
    })
  );

  router.put(
    skipBodyValidation({
      path: '/internal/app_search/engines/{engineName}/search_relevance_insights/settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/search_relevance_insights/settings',
    })
  );
}
