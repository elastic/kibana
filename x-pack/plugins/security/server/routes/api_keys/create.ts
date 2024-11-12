/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  crossClusterApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
  restApiKeySchema,
} from '@kbn/security-plugin-types-server';

import type { RouteDefinitionParams } from '..';
import { CreateApiKeyValidationError } from '../../authentication/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

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
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the scoped ES cluster client of the internal authentication service',
        },
      },
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
