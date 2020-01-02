/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../../index';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapError } from '../../../errors';
import {
  ElasticsearchRole,
  getPutPayloadSchema,
  transformPutPayloadToElasticsearchRole,
} from './model';

export function definePutRolesRoutes({ router, authz, clusterClient }: RouteDefinitionParams) {
  router.put(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }),
        body: getPutPayloadSchema(() => {
          const privileges = authz.privileges.get();
          return {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
          };
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { name } = request.params;

      try {
        const rawRoles: Record<string, ElasticsearchRole> = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole', {
            name: request.params.name,
            ignore: [404],
          });

        const body = transformPutPayloadToElasticsearchRole(
          request.body,
          authz.applicationName,
          rawRoles[name] ? rawRoles[name].applications : []
        );

        await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.putRole', { name: request.params.name, body });

        return response.noContent();
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
