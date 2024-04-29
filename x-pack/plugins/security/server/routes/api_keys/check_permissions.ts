/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import type { ApiKey } from '../../../common/model';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Response of Kibana to confirm users have permissions to generate API keys
 */

export function hasPermissionRoutes({ router, getAuthenticationService }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key',
      validate: false,
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const authenticationService = getAuthenticationService();

        const [{ cluster: clusterPrivileges }, areApiKeysEnabled] = await Promise.all([
          esClient.asCurrentUser.security.hasPrivileges({
            body: {
              cluster: ['manage_own_api_key'],
            },
          }),
          authenticationService.apiKeys.areAPIKeysEnabled(),
        ]);

        if (!areApiKeysEnabled) {
          return response.notFound({
            body: {
              message:
                "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
            },
          });
        }

        const apiResponse = await esClient.asCurrentUser.security.getApiKey({
          owner: !clusterPrivileges.manage_api_key && !clusterPrivileges.read_security,
        });

        const validKeys = apiResponse.api_keys
          .filter(({ invalidated }) => !invalidated)
          .map((key) => {
            if (!key.name) {
              key.name = key.id;
            }

            // only return the keys for user with manage own api key permission
            if (clusterPrivileges.manage_own_api_key) return key;
          });

        return response.ok<{ apiKeys: ApiKey[] }>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about cross-cluster API keys yet.
            apiKeys: validKeys,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
