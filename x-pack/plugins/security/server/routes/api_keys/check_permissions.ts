/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { RouteDefinitionParams } from '..';
import type { ApiKey } from '../../../common/model';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

interface ValidPermissionsResult {
  apiKeys: ApiKey[];
}

export function ValidPermissionsFactory(req: KibanaRequest, keys?: ApiKey[]) {
  const validPermissionsRequestCache = new WeakMap<KibanaRequest, ApiKey[]>();
  if (validPermissionsRequestCache.has(req)) {
    return validPermissionsRequestCache.get(req);
  } else if (keys) {
    validPermissionsRequestCache.set(req, keys);
  }
}

/**
 * Response of Kibana to confirm users have permissions to generate API keys
 */
export function defineValidPermissionRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key/valid_permissions',
      validate: false,
      options: {
        access: 'internal',
      },
    },
    // @ts-ignore undefined would return but is caught by the cache function
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

        if (ValidPermissionsFactory(request)) {
          return ValidPermissionsFactory(request);
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
            if (clusterPrivileges.manage_own_api_key) {
              return key;
            }
          });

        const validKeysResponse = response.ok<ValidPermissionsResult>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about cross-cluster API keys yet.
            apiKeys: validKeys,
          },
        });

        ValidPermissionsFactory(request, validKeysResponse.payload?.apiKeys);
        return validKeysResponse;
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
