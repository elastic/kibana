/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const roleMappingBaseSchema = {
  rules: schema.recordOf(schema.string(), schema.string()),
  roleType: schema.string(),
  engines: schema.arrayOf(schema.string()),
  accessAllEngines: schema.boolean(),
  authProvider: schema.arrayOf(schema.string()),
};

export function registerRoleMappingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/role_mappings',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/role_mappings',
    })
  );

  router.post(
    {
      path: '/api/app_search/role_mappings',
      validate: {
        body: schema.object(roleMappingBaseSchema),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/role_mappings',
    })
  );
}

export function registerRoleMappingRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/api/app_search/role_mappings/{id}',
      validate: {
        body: schema.object(roleMappingBaseSchema),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/role_mappings/:id',
    })
  );

  router.delete(
    {
      path: '/api/app_search/role_mappings/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/role_mappings/:id',
    })
  );
}

export const registerRoleMappingsRoutes = (dependencies: RouteDependencies) => {
  registerRoleMappingsRoute(dependencies);
  registerRoleMappingRoute(dependencies);
};
