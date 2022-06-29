/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { CreateApiKeyValidationError } from '../../authentication/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { elasticsearchRoleSchema, getKibanaRoleSchema } from '../../lib';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const bodySchema = schema.object({
  name: schema.string(),
  expiration: schema.maybe(schema.string()),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

const getBodySchemaWithKibanaPrivileges = (
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) =>
  schema.object({
    name: schema.string(),
    expiration: schema.maybe(schema.string()),
    kibana_role_descriptors: schema.recordOf(
      schema.string(),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
    metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  });

export function defineCreateApiKeyRoutes({
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
  router.post(
    {
      path: '/internal/security/api_key',
      validate: {
        body: schema.oneOf([bodySchema, bodySchemaWithKibanaPrivileges]),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const apiKey = await getAuthenticationService().apiKeys.create(request, request.body);

        if (!apiKey) {
          return response.badRequest({ body: { message: `API Keys are not available` } });
        }

        return response.ok({ body: apiKey });
      } catch (error) {
        if (error instanceof CreateApiKeyValidationError) {
          return response.badRequest({ body: { message: error.message } });
        }
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
