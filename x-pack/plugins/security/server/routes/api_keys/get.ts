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
        const esClient = (await context.core).elasticsearch.client;
        const authenticationService = getAuthenticationService();

        const [{ cluster: clusterPrivileges }, areApiKeysEnabled, areCrossClusterApiKeysEnabled] =
          await Promise.all([
            esClient.asCurrentUser.security.hasPrivileges({
              body: {
                cluster: [
                  'manage_security',
                  'read_security',
                  'manage_api_key',
                  'manage_own_api_key',
                ],
              },
            }),
            authenticationService.apiKeys.areAPIKeysEnabled(),
            authenticationService.apiKeys.areCrossClusterAPIKeysEnabled(),
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
            return key;
          });

        return response.ok<GetAPIKeysResult>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about cross-cluster API keys yet.
            apiKeys: validKeys,
            canManageCrossClusterApiKeys:
              clusterPrivileges.manage_security && areCrossClusterApiKeysEnabled,
            canManageApiKeys: clusterPrivileges.manage_api_key,
            canManageOwnApiKeys: clusterPrivileges.manage_own_api_key,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
