/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { wrapError } from '../../errors';
import { RouteDefinitionParams } from '..';

export function defineRoleMappingDeleteRoutes(params: RouteDefinitionParams) {
  const { clusterClient, router } = params;

  router.delete(
    {
      path: '/internal/security/role_mapping/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const deleteResponse = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.deleteRoleMapping', {
            name: request.params.name,
          });
        return response.ok({ body: deleteResponse });
      } catch (error) {
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );
}
