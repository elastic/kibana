/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { GetUserProfileResponse, UserProfileWithSecurity } from '../../../common';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineGetCurrentUserProfileRoute({
  router,
  getUserProfileService,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/user_profile',
      validate: {
        query: schema.object({ dataPath: schema.maybe(schema.string()) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const authenticationService = await getAuthenticationService();
      const currentUser = authenticationService.getCurrentUser(request);
      if (!currentUser) {
        return response.notFound();
      }

      let profile: UserProfileWithSecurity | null;
      try {
        profile = await getUserProfileService().getCurrent({
          request,
          dataPath: request.query.dataPath,
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }

      if (!profile) {
        return response.notFound();
      }

      const body: GetUserProfileResponse = {
        ...profile,
        user: { ...profile.user, authentication_provider: currentUser.authentication_provider },
      };
      return response.ok({ body });
    })
  );
}
