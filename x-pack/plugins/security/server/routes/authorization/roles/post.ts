/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { roleGrantsSubFeaturePrivileges } from './lib';
import {
  getBulkCreateOrUpdatePayloadSchema,
  transformPutPayloadToElasticsearchRole,
} from './model';
import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { validateKibanaPrivileges } from '../../../lib';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

type RolesErrorsDetails = Record<
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
    details: RolesErrorsDetails;
  };
}

export function defineBulkCreateOrUpdateRolesRoutes({
  router,
  authz,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/roles',
      options: {
        access: 'public',
        summary: 'Create or update roles',
      },
      validate: {
        body: getBulkCreateOrUpdatePayloadSchema(() => {
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

        const { roles } = request.body;
        const validatedRolesNames = [];
        const kibanaErrors: RolesErrorsDetails = {};

        for (const [roleName, role] of Object.entries(roles)) {
          const { validationErrors } = validateKibanaPrivileges(features, role.kibana);

          if (validationErrors.length) {
            kibanaErrors[roleName] = {
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
              roles[roleName],
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

        for (const roleName of [
          ...(esResponse.created ?? []),
          ...(esResponse.updated ?? []),
          ...(esResponse.noop ?? []),
        ]) {
          if (roleGrantsSubFeaturePrivileges(features, roles[roleName])) {
            getFeatureUsageService().recordSubFeaturePrivilegeUsage();
          }
        }

        const { created, noop, updated, errors: esErrors } = esResponse;
        const hasAnyErrors = Object.keys(kibanaErrors).length || esErrors?.count;

        return response.ok({
          body: {
            created,
            noop,
            updated,
            ...(hasAnyErrors && {
              errors: { ...kibanaErrors, ...(esErrors?.details ?? {}) },
            }),
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
