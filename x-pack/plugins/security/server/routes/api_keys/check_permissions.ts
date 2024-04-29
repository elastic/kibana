/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';

import type { RouteDefinitionParams } from '..';
import type { ApiKey } from '../../../common/model';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function permissionsFactory(req: KibanaRequest, validResponse?: IKibanaResponse) {
  const permissionsRequestCache = new WeakMap<KibanaRequest, IKibanaResponse>();
  return {
    permissionsRequestCache() {
      if (!permissionsRequestCache.has(req) && validResponse) {
        permissionsRequestCache.set(req, validResponse);
      }

      return permissionsRequestCache.get(req);
    },
  };
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
      path: '/internal/security/api_key',
      validate: false,
      options: {
        access: 'internal',
      },
    },
    // @ts-ignore response will be cached
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

        if (permissionsFactory(request)) return permissionsFactory(request);

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

        const validResponse = response.ok<{ apiKeys: ApiKey[] }>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about cross-cluster API keys yet.
            apiKeys: validKeys,
          },
        });

        // cache results
        permissionsFactory(request, validResponse);
        return validResponse;
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
