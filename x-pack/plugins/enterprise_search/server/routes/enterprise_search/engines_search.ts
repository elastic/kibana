/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerEnginesSearchRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/engines/{engine_name}/search',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      hasJsonResponse: true,
      path: '/api/engines/:engine_name/_search',
    })
  );
}
