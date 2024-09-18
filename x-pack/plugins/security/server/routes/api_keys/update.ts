/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UpdateAPIKeyResult } from '@kbn/security-plugin-types-server';
import {
  getUpdateRestApiKeyWithKibanaPrivilegesSchema,
  updateCrossClusterApiKeySchema,
  updateRestApiKeySchema,
} from '@kbn/security-plugin-types-server';

import type { RouteDefinitionParams } from '..';
import { UpdateApiKeyValidationError } from '../../authentication/api_keys/api_keys';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineUpdateApiKeyRoutes({
  router,
  authz,
  getAuthenticationService,
}: RouteDefinitionParams) {
  const bodySchemaWithKibanaPrivileges = getUpdateRestApiKeyWithKibanaPrivilegesSchema(() => {
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
          updateRestApiKeySchema,
          updateCrossClusterApiKeySchema,
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
