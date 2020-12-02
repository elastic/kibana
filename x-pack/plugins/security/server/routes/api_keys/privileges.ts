/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

export function defineCheckPrivilegesRoutes({ router, authc }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key/privileges',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const [
          {
            body: {
              cluster: {
                manage_security: manageSecurity,
                manage_api_key: manageApiKey,
                manage_own_api_key: manageOwnApiKey,
              },
            },
          },
          areApiKeysEnabled,
        ] = await Promise.all([
          context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges<{
            cluster: {
              manage_security: boolean;
              manage_api_key: boolean;
              manage_own_api_key: boolean;
            };
          }>({
            body: { cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'] },
          }),
          authc.areAPIKeysEnabled(),
        ]);

        const isAdmin = manageSecurity || manageApiKey;
        const canManage = manageSecurity || manageApiKey || manageOwnApiKey;

        return response.ok({
          body: { areApiKeysEnabled, isAdmin, canManage },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
