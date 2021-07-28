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
  router.post(
    skipBodyValidation({
      path: '/api/app_search/engines/{engineName}/search',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        query: schema.object({
          query: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/dashboard_search',
    })
  );

  // Search UI always posts it's requests to {some_configured_base_url}/api/as/v1/engines/{engineName}/search.json
  // For that reason, we have to create a proxy url with that same suffix below, so that we can proxy Search UI
  // requests through Kibana's server.
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
      path: '/as/engines/:engineName/dashboard_search',
    })
  );
}
