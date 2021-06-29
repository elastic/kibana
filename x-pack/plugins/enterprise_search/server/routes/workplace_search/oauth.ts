/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerOAuthAuthorizeRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/oauth/authorize',
      validate: {
        query: schema.object({
          access_type: schema.maybe(schema.string()),
          client_id: schema.string(),
          code_challenge: schema.maybe(schema.string()),
          code_challenge_method: schema.maybe(schema.string()),
          response_type: schema.string(),
          response_mode: schema.maybe(schema.string()),
          redirect_uri: schema.maybe(schema.string()),
          scope: schema.maybe(schema.string()),
          state: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/oauth/authorize',
    })
  );
}

export function registerOAuthAuthorizeAcceptRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workplace_search/oauth/authorize',
      validate: {
        body: schema.object({
          client_id: schema.string(),
          response_type: schema.string(),
          redirect_uri: schema.maybe(schema.string()),
          scope: schema.maybe(schema.string()),
          state: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/oauth/authorize',
    })
  );
}

export function registerOAuthAuthorizeDenyRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.delete(
    {
      path: '/api/workplace_search/oauth/authorize',
      validate: {
        body: schema.object({
          client_id: schema.string(),
          response_type: schema.string(),
          redirect_uri: schema.maybe(schema.string()),
          scope: schema.maybe(schema.string()),
          state: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/oauth/authorize',
    })
  );
}

export const registerOAuthRoutes = (dependencies: RouteDependencies) => {
  registerOAuthAuthorizeRoute(dependencies);
  registerOAuthAuthorizeAcceptRoute(dependencies);
  registerOAuthAuthorizeDenyRoute(dependencies);
};
