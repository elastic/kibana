/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { UpdateAPIKeyResult } from '../../authentication/api_keys/api_keys';
import { UpdateApiKeyValidationError } from '../../authentication/api_keys/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { elasticsearchRoleSchema, getKibanaRoleSchema } from '../../lib';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const bodySchema = schema.object({
  id: schema.string(),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

const getBodySchemaWithKibanaPrivileges = (
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) =>
  schema.object({
    id: schema.string(),
    kibana_role_descriptors: schema.recordOf(
      schema.string(),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
    metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  });

export function defineUpdateApiKeyRoutes({
  router,
  authz,
  getAuthenticationService,
}: RouteDefinitionParams) {
  const bodySchemaWithKibanaPrivileges = getBodySchemaWithKibanaPrivileges(() => {
    const privileges = authz.privileges.get();
    return {
      global: Object.keys(privileges.global),
      space: Object.keys(privileges.space),
    };
  });

  router.put(
    {
      path: '/internal/security/api_key',
      validate: {
        body: schema.oneOf([bodySchema, bodySchemaWithKibanaPrivileges]),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const result: UpdateAPIKeyResult | null = await getAuthenticationService().apiKeys.update(
          request,
          request.body
        );

        if (result === null) {
          return response.badRequest({ body: { message: `API Keys are not available` } });
        }

        return response.ok({ body: result });
      } catch (error) {
        if (error instanceof UpdateApiKeyValidationError) {
          return response.badRequest({ body: { message: error.message } });
        }
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
