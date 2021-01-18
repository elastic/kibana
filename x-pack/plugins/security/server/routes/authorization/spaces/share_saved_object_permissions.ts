/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../../index';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../../errors';

export function defineShareSavedObjectPermissionRoutes({ router, authz }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/_share_saved_object_permissions',
      validate: { query: schema.object({ type: schema.string() }) },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      let shareToAllSpaces = true;
      const { type } = request.query;

      try {
        const checkPrivileges = authz.checkPrivilegesWithRequest(request);
        shareToAllSpaces = (
          await checkPrivileges.globally({
            kibana: authz.actions.savedObject.get(type, 'share_to_space'),
          })
        ).hasAllRequested;
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
      return response.ok({ body: { shareToAllSpaces } });
    })
  );
}
