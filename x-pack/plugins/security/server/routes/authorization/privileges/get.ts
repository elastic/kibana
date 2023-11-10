/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineGetPrivilegesRoutes({ router, authz }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/privileges',
      validate: {
        query: schema.object({
          // We don't use `schema.boolean` here, because all query string parameters are treated as
          // strings and @kbn/config-schema doesn't coerce strings to booleans.
          includeActions: schema.maybe(
            schema.oneOf([schema.literal('true'), schema.literal('false')])
          ),
          respectLicenseLevel: schema.maybe(
            schema.oneOf([schema.literal('true'), schema.literal('false')])
          ),
        }),
      },
    },
    createLicensedRouteHandler((context, request, response) => {
      const respectLicenseLevel = request.query.respectLicenseLevel !== 'false'; // if undefined resolve to true by default
      const privileges = authz.privileges.get(respectLicenseLevel);
      const includeActions = request.query.includeActions === 'true';
      const privilegesResponseBody = includeActions
        ? privileges
        : {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
            features: Object.entries(privileges.features).reduce(
              (acc, [featureId, featurePrivileges]) => {
                acc[featureId] = Object.keys(featurePrivileges);
                return acc;
              },
              {} as Record<string, string[]>
            ),
            reserved: Object.keys(privileges.reserved),
          };

      return response.ok({ body: privilegesResponseBody });
    })
  );
}
