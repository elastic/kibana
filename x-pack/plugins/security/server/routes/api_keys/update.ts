/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { elasticsearchRoleSchema, getKibanaRoleSchema } from '@kbn/security-plugin-types-server';

import type { RouteDefinitionParams } from '..';
import { UpdateApiKeyValidationError } from '../../authentication/api_keys/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Response of Kibana Update API key endpoint.
 */
export type UpdateAPIKeyResult = estypes.SecurityUpdateApiKeyResponse;

/**
 * Request body of Kibana Update API key endpoint.
 */
export type UpdateAPIKeyParams =
  | UpdateRestAPIKeyParams
  | UpdateCrossClusterAPIKeyParams
  | UpdateRestAPIKeyWithKibanaPrivilegesParams;

export type UpdateRestAPIKeyParams = TypeOf<typeof restApiKeySchema>;
export type UpdateCrossClusterAPIKeyParams = TypeOf<typeof crossClusterApiKeySchema>;
export type UpdateRestAPIKeyWithKibanaPrivilegesParams = TypeOf<
  ReturnType<typeof getRestApiKeyWithKibanaPrivilegesSchema>
>;

const restApiKeySchema = schema.object({
  type: schema.maybe(schema.literal('rest')),
  id: schema.string(),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

const crossClusterApiKeySchema = restApiKeySchema.extends({
  type: schema.literal('cross_cluster'),
  role_descriptors: null,
  access: schema.object(
    {
      search: schema.maybe(
        schema.arrayOf(
          schema.object(
            {
              names: schema.arrayOf(schema.string()),
            },
            { unknowns: 'allow' }
          )
        )
      ),
      replication: schema.maybe(
        schema.arrayOf(
          schema.object(
            {
              names: schema.arrayOf(schema.string()),
            },
            { unknowns: 'allow' }
          )
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

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

export function defineUpdateApiKeyRoutes({
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

  router.put(
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
