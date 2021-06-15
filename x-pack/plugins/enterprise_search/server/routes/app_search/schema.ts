/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { skipBodyValidation } from '../../lib/route_config_helpers';
import { RouteDependencies } from '../../plugin';

export function registerSchemaRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/schema',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/schema',
    })
  );

  router.post(
    skipBodyValidation({
      path: '/api/app_search/engines/{engineName}/schema',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    }),
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/schema',
    })
  );

  router.get(
    {
      path: '/api/app_search/engines/{engineName}/reindex_job/{reindexJobId}',
      validate: {
        params: schema.object({
          engineName: schema.string(),
          reindexJobId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/reindex_job/:reindexJobId',
    })
  );
}
