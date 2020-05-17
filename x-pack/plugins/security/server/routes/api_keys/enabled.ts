/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

export function defineEnabledApiKeysRoutes({ router, authc }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key/_enabled',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const apiKeysEnabled = await authc.areAPIKeysEnabled();

        return response.ok({ body: { apiKeysEnabled } });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
