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
  groups: schema.arrayOf(schema.string()),
  allGroups: schema.boolean(),
};

export function registerOrgEnableRoleMappingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/role_mappings/enable_role_based_access',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/enable_role_based_access',
    })
  );
}

export function registerOrgRoleMappingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/role_mappings',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/collection',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/org/role_mappings',
      validate: {
        body: schema.object(roleMappingBaseSchema),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/collection',
    })
  );
}

export function registerOrgRoleMappingRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/internal/workplace_search/org/role_mappings/{id}',
      validate: {
        body: schema.object(roleMappingBaseSchema),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/:id',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/org/role_mappings/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/:id',
    })
  );
}

export function registerOrgUserRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/single_user_role_mapping',
      validate: {
        body: schema.object({
          roleMapping: schema.object({
            groups: schema.arrayOf(schema.string()),
            roleType: schema.string(),
            allGroups: schema.boolean(),
            id: schema.maybe(schema.string()),
          }),
          elasticsearchUser: schema.object({
            username: schema.string(),
            email: schema.string(),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/role_mappings/upsert_single_user_role_mapping',
    })
  );
}

export const registerRoleMappingsRoutes = (dependencies: RouteDependencies) => {
  registerOrgEnableRoleMappingsRoute(dependencies);
  registerOrgRoleMappingsRoute(dependencies);
  registerOrgRoleMappingRoute(dependencies);
  registerOrgUserRoute(dependencies);
};
