/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../..';
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
        }),
      },
    },
    createLicensedRouteHandler((context, request, response) => {
      const privileges = authz.privileges.get();
      const includeActions = request.query.includeActions === 'true';
      const privilegesResponseBody = includeActions
        ? privileges
        : {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
            features: Object.entries(privileges.features).reduce(
              (acc, [featureId, featurePrivileges]) => {
                return {
                  ...acc,
                  [featureId]: Object.keys(featurePrivileges),
                };
              },
              {}
            ),
            reserved: Object.keys(privileges.reserved),
          };

      return response.ok({ body: privilegesResponseBody });
    })
  );
}
