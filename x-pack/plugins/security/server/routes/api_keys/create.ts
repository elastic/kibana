/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineCreateApiKeyRoutes({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key',
      validate: {
        body: schema.object({
          name: schema.string(),
          expiration: schema.maybe(schema.string()),
          role_descriptors: schema.recordOf(
            schema.string(),
            schema.object({}, { unknowns: 'allow' }),
            {
              defaultValue: {},
            }
          ),
          metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        }),
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
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
