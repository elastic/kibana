/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RouteMethod } from 'src/core/server';
import { AuthenticatedUser } from '../../../../security/server';
import { ReportingCore } from '../../core';
import { getUserFactory } from './get_user';

type ReportingUser = AuthenticatedUser | null;
const superuserRole = 'superuser';

export type RequestHandlerUser = RequestHandler extends (...a: infer U) => infer R
  ? (user: ReportingUser, ...a: U) => R
  : never;

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(
  reporting: ReportingCore
) {
  const setupDeps = reporting.getPluginSetupDeps();
  const getUser = getUserFactory(setupDeps.security);
  return <P, Q, B>(handler: RequestHandlerUser): RequestHandler<P, Q, B, RouteMethod> => {
    return (context, req, res) => {
      let user: ReportingUser = null;
      if (setupDeps.security && setupDeps.security.license.isEnabled()) {
        // find the authenticated user, or null if security is not enabled
        user = getUser(req);
        if (!user) {
          // security is enabled but the user is null
          return res.unauthorized({ body: `Sorry, you aren't authenticated` });
        }
      }

      if (user) {
        // check allowance with the configured set of roleas + "superuser"
        const config = reporting.getConfig();
        const allowedRoles = config.get('roles', 'allow') || [];
        const authorizedRoles = [superuserRole, ...allowedRoles];

        if (!user.roles.find((role) => authorizedRoles.includes(role))) {
          // user's roles do not allow
          return res.forbidden({ body: `Sorry, you don't have access to Reporting` });
        }
      }

      return handler(user, context, req, res);
    };
  };
};
