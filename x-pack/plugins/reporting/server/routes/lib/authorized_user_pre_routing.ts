/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RouteMethod } from 'src/core/server';
import { AuthenticatedUser } from '../../../../security/server';
import { ReportingCore } from '../../core';
import { getUser } from './get_user';
import type { ReportingRequestHandlerContext } from '../../types';

const superuserRole = 'superuser';

type ReportingRequestUser = AuthenticatedUser | false;

export type RequestHandlerUser<P, Q, B> = RequestHandler<
  P,
  Q,
  B,
  ReportingRequestHandlerContext
> extends (...a: infer U) => infer R
  ? (user: ReportingRequestUser, ...a: U) => R
  : never;

export const authorizedUserPreRouting = <P, Q, B>(
  reporting: ReportingCore,
  handler: RequestHandlerUser<P, Q, B>
): RequestHandler<P, Q, B, ReportingRequestHandlerContext, RouteMethod> => {
  const { logger, security } = reporting.getPluginSetupDeps();

  return async (context, req, res) => {
    const { security: securityStart } = await reporting.getPluginStartDeps();
    try {
      let user: ReportingRequestUser = false;
      if (security && security.license.isEnabled()) {
        // find the authenticated user, or null if security is not enabled
        user = getUser(req, securityStart);
        if (!user) {
          // security is enabled but the user is null
          return res.unauthorized({ body: `Sorry, you aren't authenticated` });
        }
      }

      const deprecatedAllowedRoles = reporting.getDeprecatedAllowedRoles();
      if (user && deprecatedAllowedRoles !== false) {
        // check allowance with the configured set of roleas + "superuser"
        const allowedRoles = deprecatedAllowedRoles || [];
        const authorizedRoles = [superuserRole, ...allowedRoles];

        if (!user.roles.find((role) => authorizedRoles.includes(role))) {
          // user's roles do not allow
          return res.forbidden({ body: `Sorry, you don't have access to Reporting` });
        }
      }

      return handler(user, context, req, res);
    } catch (err) {
      logger.error(err);
      return res.custom({ statusCode: 500 });
    }
  };
};
