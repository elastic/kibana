/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const resultFields = schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }));

export function registerResultSettingsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/result_settings/details',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/result_settings/details',
    })
  );

  router.put(
    {
      path: '/api/app_search/engines/{engineName}/result_settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: schema.object({
          result_fields: resultFields,
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/result_settings',
    })
  );

  router.post(
    {
      path: '/api/app_search/engines/{engineName}/sample_response_search',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: schema.object({
          query: schema.string(),
          result_fields: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' })),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/sample_response_search',
    })
  );
}
