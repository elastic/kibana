/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { RawKibanaPrivileges } from '../../../../../common/model';

export function initGetPrivilegesApi(
  server: Record<string, any>,
  routePreCheckLicenseFn: () => void
) {
  server.route({
    method: 'GET',
    path: '/api/security/privileges',
    handler(req: Record<string, any>) {
      const { authorization } = server.plugins.security;
      const privileges: RawKibanaPrivileges = authorization.privileges.get();

      if (req.query.includeActions) {
        return privileges;
      }

      return {
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
    },
    config: {
      pre: [routePreCheckLicenseFn],
      validate: {
        query: Joi.object().keys({
          includeActions: Joi.bool(),
        }),
      },
    },
  });
}
