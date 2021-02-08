/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

// We only do a very light type check here, and allow unknowns, because the request is validated
// on the ent-search server, so it would be redundant to check it here as well.
const boosts = schema.recordOf(
  schema.string(),
  schema.arrayOf(schema.object({}, { unknowns: 'allow' }))
);
const resultFields = schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }));
const searchFields = schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }));

const searchSettingsSchema = schema.object({
  boosts,
  result_fields: resultFields,
  search_fields: searchFields,
});

export function registerSearchSettingsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/engines/{engineName}/search_settings/details',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/search_settings/details',
    })
  );

  router.post(
    {
      path: '/api/app_search/engines/{engineName}/search_settings/reset',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/search_settings/reset',
    })
  );

  router.put(
    {
      path: '/api/app_search/engines/{engineName}/search_settings',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: searchSettingsSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/search_settings',
    })
  );

  router.post(
    {
      path: '/api/app_search/engines/{engineName}/search_settings_search',
      validate: {
        params: schema.object({
          engineName: schema.string(),
        }),
        body: schema.object({
          boosts,
          search_fields: searchFields,
        }),
        query: schema.object({
          query: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/:engineName/search_settings_search',
    })
  );
}
