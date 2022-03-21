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

export function defineUpdateUserProfileDataRoute({
  router,
  getSession,
  getUserProfileService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/user_profile/_data',
      validate: {
        body: schema.recordOf(schema.string(), schema.any()),
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
        await userProfileService.update(session.userProfileId, request.body);
        return response.ok();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
