/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../..';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapError } from '../../../errors';
import { transformElasticsearchRoleToRole } from './model';

export function defineGetRolesRoutes({ router, authz, clusterClient }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/role/{name}',
      validate: { params: schema.object({ name: schema.string({ minLength: 1 }) }) },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const elasticsearchRoles = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole', { name: request.params.name });

        const elasticsearchRole = elasticsearchRoles[request.params.name];
        if (elasticsearchRole) {
          return response.ok({
            body: transformElasticsearchRoleToRole(
              elasticsearchRole,
              request.params.name,
              authz.applicationName
            ),
          });
        }

        return response.notFound();
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
