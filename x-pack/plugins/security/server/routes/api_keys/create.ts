/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { CreateApiKeyValidationError } from '../../authentication/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { elasticsearchRoleSchema, getKibanaRoleSchema } from '../../lib';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Response of Kibana Create API key endpoint.
 */
export type CreateAPIKeyResult = estypes.SecurityCreateApiKeyResponse;

/**
 * Request body of Kibana Create API key endpoint.
 */
export type CreateAPIKeyParams =
  | CreateRestAPIKeyParams
  | CreateRestAPIKeyWithKibanaPrivilegesParams
  | CreateCrossClusterAPIKeyParams;

export type CreateRestAPIKeyParams = TypeOf<typeof restApiKeySchema>;
export type CreateRestAPIKeyWithKibanaPrivilegesParams = TypeOf<
  ReturnType<typeof getRestApiKeyWithKibanaPrivilegesSchema>
>;
export type CreateCrossClusterAPIKeyParams = TypeOf<typeof crossClusterApiKeySchema>;

export const restApiKeySchema = schema.object({
  type: schema.maybe(schema.literal('rest')),
  name: schema.string(),
  expiration: schema.maybe(schema.string()),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const getRestApiKeyWithKibanaPrivilegesSchema = (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) =>
  restApiKeySchema.extends({
    role_descriptors: null,
    kibana_role_descriptors: schema.recordOf(
      schema.string(),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
  });

export const crossClusterApiKeySchema = restApiKeySchema.extends({
  type: schema.literal('cross_cluster'),
  role_descriptors: null,
  access: schema.object(
    {
      search: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string()),
          })
        )
      ),
      replication: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string()),
          })
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

export function defineCreateApiKeyRoutes({
  router,
  authz,
  getAuthenticationService,
}: RouteDefinitionParams) {
  const bodySchemaWithKibanaPrivileges = getRestApiKeyWithKibanaPrivilegesSchema(() => {
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
        body: schema.oneOf([
          restApiKeySchema,
          bodySchemaWithKibanaPrivileges,
          crossClusterApiKeySchema,
        ]),
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const createdApiKey = await getAuthenticationService().apiKeys.create(
          request,
          request.body
        );

        if (!createdApiKey) {
          return response.badRequest({ body: { message: 'API Keys are not available' } });
        }

        return response.ok({ body: createdApiKey });
      } catch (error) {
        if (error instanceof CreateApiKeyValidationError) {
          return response.badRequest({ body: { message: error.message } });
        }
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
