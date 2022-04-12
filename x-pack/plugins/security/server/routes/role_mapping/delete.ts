/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../';
import { wrapError } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineRoleMappingDeleteRoutes({ router }: RouteDefinitionParams) {
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
        const esClient = (await context.core).elasticsearch.client;
        const deleteResponse = await esClient.asCurrentUser.security.deleteRoleMapping({
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
