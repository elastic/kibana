/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerApiKeysRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/api_keys',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/api_tokens',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/api_keys',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/api_tokens',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/api_keys/{tokenName}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          tokenName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/api_tokens/:tokenName',
    })
  );
}

export const registerApiKeysRoutes = (dependencies: RouteDependencies) => {
  registerApiKeysRoute(dependencies);
};
