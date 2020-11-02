/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { elasticsearchRoleSchema } from '../authorization/roles/model/put_payload';
import { RouteDefinitionParams } from '..';

export function defineCreateApiKeyRoutes({ router, authc }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key',
      validate: {
        body: schema.object({
          name: schema.string(),
          expiration: schema.maybe(schema.string()),
          role_descriptors: schema.recordOf(schema.string(), elasticsearchRoleSchema, {
            defaultValue: {},
          }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const apiKey = await authc.createAPIKey(request, request.body);

        if (!apiKey) {
          return response.badRequest({ body: { message: `API Keys are not available` } });
        }

        return response.ok({ body: apiKey });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
