/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { roleGrantsSubFeaturePrivileges } from './lib';
import { getPutPayloadSchema, transformPutPayloadToElasticsearchRole } from './model';
import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { validateKibanaPrivileges } from '../../../lib';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function definePutRolesRoutes({
  router,
  authz,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.put(
    {
      path: '/api/security/role/{name}',
      options: {
        access: 'public',
        summary: `Create or update a role`,
      },
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }),
        query: schema.object({ createOnly: schema.boolean({ defaultValue: false }) }),
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
      const { createOnly } = request.query;
      try {
        const esClient = (await context.core).elasticsearch.client;

        const [features, rawRoles] = await Promise.all([
          getFeatures(),
          esClient.asCurrentUser.security.getRole({ name: request.params.name }, { ignore: [404] }),
        ]);

        const { validationErrors } = validateKibanaPrivileges(features, request.body.kibana);

        if (validationErrors.length) {
          return response.badRequest({
            body: {
              message: `Role cannot be updated due to validation errors: ${JSON.stringify(
                validationErrors
              )}`,
            },
          });
        }

        if (createOnly && !!rawRoles[name]) {
          return response.conflict({
            body: {
              message: `Role already exists and cannot be created: ${name}`,
            },
          });
        }

        const body = transformPutPayloadToElasticsearchRole(
          request.body,
          authz.applicationName,
          rawRoles[name] ? rawRoles[name].applications : []
        );

        await esClient.asCurrentUser.security.putRole({
          name: request.params.name,
          body,
        });

        if (roleGrantsSubFeaturePrivileges(features, request.body)) {
          getFeatureUsageService().recordSubFeaturePrivilegeUsage();
        }

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
