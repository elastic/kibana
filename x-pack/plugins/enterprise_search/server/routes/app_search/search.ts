/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { skipBodyValidation } from '../../lib/route_config_helpers';

import { RouteDependencies } from '../../plugin';

export function registerSearchRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/search',
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
      path: '/api/as/v1/engines/:engineName/search.json',
    })
  );

  // For the Search UI routes below, Search UI always uses the full API path, like:
  // "/api/as/v1/engines/{engineName}/search.json". We only have control over the base path
  // in Search UI, so we created a common basepath of "/api/app_search/search-ui" here that
  // Search UI can use.
  //
  // Search UI *also* uses the click tracking and query suggestion endpoints, however, since the
  // App Search plugin doesn't use that portion of Search UI, we only set up a proxy for the search endpoint below.
  router.post(
    skipBodyValidation({
      path: '/api/app_search/search-ui/api/as/v1/engines/{engineName}/search.json',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/as/v1/engines/:engineName/search.json',
    })
  );
}
