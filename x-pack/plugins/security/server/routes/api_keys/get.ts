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

export function defineGetApiKeysRoutes({ router }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/api_key',
      validate: {
        query: schema.object({
          // We don't use `schema.boolean` here, because all query string parameters are treated as
          // strings and @kbn/config-schema doesn't coerce strings to booleans.
          //
          // A boolean flag that can be used to query API keys owned by the currently authenticated
          // user. `false` means that only API keys of currently authenticated user will be returned.
          isAdmin: schema.oneOf([schema.literal('true'), schema.literal('false')]),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const isAdmin = request.query.isAdmin === 'true';
        const apiResponse =
          await context.core.elasticsearch.client.asCurrentUser.security.getApiKey({
            owner: !isAdmin,
          });

        const validKeys = apiResponse.api_keys.filter(({ invalidated }) => !invalidated);

        return response.ok({ body: { apiKeys: validKeys } });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
