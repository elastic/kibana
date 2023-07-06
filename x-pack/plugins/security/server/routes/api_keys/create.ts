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

export type CreateAPIKeyParams =
  | CreateRestAPIKeyParams
  | CreateCrossClusterAPIKeyParams
  | CreateRestAPIKeyWithKibanaPrivilegesParams;

/**
 * The return value when creating an API key in Elasticsearch. The API key returned by this API
 * can then be used by sending a request with a Authorization header with a value having the
 * prefix ApiKey `{token}` where token is id and api_key joined by a colon `{id}:{api_key}` and
 * then encoded to base64.
 */
export type CreateAPIKeyResult = estypes.SecurityCreateApiKeyResponse;

export type CreateRestAPIKeyParams = TypeOf<typeof restApiKeySchema>;

const restApiKeySchema = schema.object({
  type: schema.maybe(schema.literal('rest')),
  name: schema.string(),
  expiration: schema.maybe(schema.string()),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export type CreateCrossClusterAPIKeyParams = TypeOf<typeof crossClusterApiKeySchema>;

const crossClusterApiKeySchema = restApiKeySchema.extends({
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

export type CreateRestAPIKeyWithKibanaPrivilegesParams = TypeOf<
  ReturnType<typeof getRestApiKeyWithKibanaPrivilegesSchema>
>;

const getRestApiKeyWithKibanaPrivilegesSchema = (
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
          crossClusterApiKeySchema,
          bodySchemaWithKibanaPrivileges,
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
