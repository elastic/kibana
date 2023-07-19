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
 * Response of Kibana Get API keys endpoint.
 */
export interface GetAPIKeysResult {
  apiKeys: ApiKey[];
  canManageCrossClusterApiKeys: boolean;
  canManageApiKeys: boolean;
  canManageOwnApiKeys: boolean;
}

export function defineGetApiKeysRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
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
        const { elasticsearch } = await context.core;

        const [
          {
            cluster: {
              manage_security: manageSecurity,
              manage_api_key: manageApiKey,
              manage_own_api_key: manageOwnApiKey,
            },
          },
          areApiKeysEnabled,
          areCrossClusterApiKeysEnabled,
        ] = await Promise.all([
          elasticsearch.client.asCurrentUser.security.hasPrivileges({
            body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
          }),
          getAuthenticationService().apiKeys.areAPIKeysEnabled(),
          getAuthenticationService().apiKeys.areCrossClusterAPIKeysEnabled(),
        ]);

        if (!areApiKeysEnabled) {
          return response.notFound({
            body: {
              message:
                "API key service has been disabled in Elasticsearch using 'xpack.security.authc.api_key.enabled' setting.",
            },
          });
        }

        const canManageCrossClusterApiKeys = manageSecurity && areCrossClusterApiKeysEnabled;
        const canManageApiKeys = manageSecurity || manageApiKey;
        const canManageOwnApiKeys = manageSecurity || manageApiKey || manageOwnApiKey;

        const apiResponse = await elasticsearch.client.asCurrentUser.security.getApiKey({
          owner: !canManageApiKeys,
        });

        const validKeys = apiResponse.api_keys.filter(({ invalidated }) => !invalidated);

        return response.ok<GetAPIKeysResult>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
            apiKeys: validKeys,
            canManageCrossClusterApiKeys,
            canManageApiKeys,
            canManageOwnApiKeys,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
