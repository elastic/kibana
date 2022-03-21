/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../';
import type { AuthenticatedUserProfile } from '../../../common/';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineGetUserProfileRoute({
  router,
  getSession,
  getUserProfileService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/user_profile',
      validate: {
        query: schema.object({ data: schema.maybe(schema.string()) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const session = await getSession().get(request);
      if (!session) {
        return response.unauthorized();
      }
      if (!session.userProfileId) {
        return response.notFound();
      }

      const userProfileService = getUserProfileService();
      try {
        const profile = await userProfileService.get(session.userProfileId, request.query.data);
        const body: AuthenticatedUserProfile = {
          ...profile,
          authentication_provider: session.provider,
        };
        return response.ok({ body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
