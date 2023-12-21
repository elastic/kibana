/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Response of Kibana Has API keys endpoint.
 */
export interface HasAPIKeysResult {
  hasApiKeys: boolean;
}

export function defineHasApiKeysRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key/_has_active',
      validate: false,
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, _request, response) => {
      const esClient = (await context.core).elasticsearch.client;
      const authenticationService = getAuthenticationService();

      const areApiKeysEnabled = await authenticationService.apiKeys.areAPIKeysEnabled();

      if (!areApiKeysEnabled) {
        return response.notFound({
          body: {
            message:
              "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
          },
        });
      }

      const { api_keys: apiKeys } = await esClient.asCurrentUser.security.getApiKey({
        owner: true,
        // @ts-expect-error @elastic/elasticsearch SecurityGetApiKeyRequest.active_only: boolean | undefined
        active_only: true,
      });

      // simply return true if the result array is non-empty
      return response.ok<HasAPIKeysResult>({
        body: {
          hasApiKeys: apiKeys.length > 0,
        },
      });
    })
  );
}
