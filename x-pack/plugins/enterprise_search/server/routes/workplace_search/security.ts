/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerSecurityRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/security',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/security',
    })
  );
}

export function registerSecuritySourceRestrictionsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/security/source_restrictions',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/security/source_restrictions',
    })
  );

  router.patch(
    {
      path: '/api/workplace_search/org/security/source_restrictions',
      validate: {
        body: schema.object({
          isEnabled: schema.boolean(),
          remote: schema.object({
            isEnabled: schema.boolean(),
            contentSources: schema.arrayOf(
              schema.object({
                isEnabled: schema.boolean(),
                id: schema.string(),
                name: schema.string(),
              })
            ),
          }),
          standard: schema.object({
            isEnabled: schema.boolean(),
            contentSources: schema.arrayOf(
              schema.object({
                isEnabled: schema.boolean(),
                id: schema.string(),
                name: schema.string(),
              })
            ),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/security/source_restrictions',
    })
  );
}

export const registerSecurityRoutes = (dependencies: RouteDependencies) => {
  registerSecurityRoute(dependencies);
  registerSecuritySourceRestrictionsRoute(dependencies);
};
