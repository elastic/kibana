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

export function defineUpdateProfileDataRoute({
  router,
  getUserProfileService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/profile/_data/{uid}',
      options: {
        tags: ['access:accessUserProfile', 'access:updateUserProfle'],
      },
      validate: {
        params: schema.object({ uid: schema.string() }),
        body: schema.recordOf(schema.string(), schema.any()),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const userProfileService = getUserProfileService();
      try {
        await userProfileService.update(request.params.uid, request.body);
        return response.ok();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
