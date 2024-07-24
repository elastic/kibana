/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { roleGrantsSubFeaturePrivileges } from './lib';
import { getPostPayloadSchema, transformPutPayloadToElasticsearchRole } from './model';
import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { validateKibanaPrivileges } from '../../../lib';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

type RolesErrorResponse = Record<
  string,
  {
    type: string;
    reason: string;
  }
>;

interface ESRolesResponse {
  noop?: string[];
  created?: string[];
  updated?: string[];
  errors?: {
    count: number;
    details: RolesErrorResponse;
  };
}

export function definePostRolesRoutes({
  router,
  authz,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/roles',
      options: {
        summary: 'Create or update roles',
      },
      validate: {
        body: getPostPayloadSchema(() => {
          const privileges = authz.privileges.get();
          return {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
          };
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const features = await getFeatures();

        const validatedRolesNames = [];
        const errors: RolesErrorResponse = {};

        for (const [roleName, role] of Object.entries(request.body.roles)) {
          const { validationErrors } = validateKibanaPrivileges(features, role.kibana);

          if (validationErrors.length) {
            errors[roleName] = {
              type: 'kibana_privilege_validation_exception',
              reason: `Role cannot be updated due to validation errors: ${JSON.stringify(
                validationErrors
              )}`,
            };

            continue;
          }

          validatedRolesNames.push(roleName);
        }

        const rawRoles = await esClient.asCurrentUser.security.getRole(
          { name: validatedRolesNames.join(',') },
          { ignore: [404] }
        );

        const esRolesPayload = Object.fromEntries(
          validatedRolesNames.map((roleName) => [
            roleName,
            transformPutPayloadToElasticsearchRole(
              request.body.roles[roleName],
              authz.applicationName,
              rawRoles[roleName] ? rawRoles[roleName].applications : []
            ),
          ])
        );

        const esResponse = await esClient.asCurrentUser.transport.request<ESRolesResponse>({
          method: 'POST',
          path: '/_security/role',
          body: { roles: esRolesPayload },
        });

        for (const roleName of [...(esResponse.created ?? []), ...(esResponse.updated ?? [])]) {
          if (roleGrantsSubFeaturePrivileges(features, request.body.roles[roleName])) {
            getFeatureUsageService().recordSubFeaturePrivilegeUsage();
          }
        }

        const hasAnyErrors = Object.keys(errors).length || esResponse.errors?.count;

        return response.ok({
          body: {
            created: esResponse.created,
            noop: esResponse.noop,
            updated: esResponse.updated,
            ...(hasAnyErrors && {
              errors: { ...errors, ...(esResponse.errors?.details ?? {}) },
            }),
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
