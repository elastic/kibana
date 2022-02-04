/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineGetProfileRoute({ router, getProfileService }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/profile/{uid}',
      validate: {
        params: schema.object({ uid: schema.string() }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const profileService = getProfileService();
      try {
        const profile = await profileService.get(request.params.uid, '*');
        return response.ok({ body: profile });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
