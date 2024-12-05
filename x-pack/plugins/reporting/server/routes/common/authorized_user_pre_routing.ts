/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RouteMethod } from '@kbn/core/server';
import { AuthenticatedUser } from '@kbn/security-plugin/server';

import { ReportingCore } from '../../core';
import { ReportingRequestHandlerContext } from '../../types';
import { getUser } from './get_user';

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
  const { logger, security: securitySetup } = reporting.getPluginSetupDeps(); // ReportingInternalSetup.security?: SecurityPluginSetup | undefined

  return async (context, req, res) => {
    const { securityService } = await reporting.getPluginStartDeps();
    try {
      let user: ReportingRequestUser = false;
      if (securitySetup && securitySetup.license.isEnabled()) {
        // find the authenticated user, only if license is enabled
        user = getUser(req, securityService);
        if (!user) {
          // security is enabled but the user is null
          return res.unauthorized({ body: `Sorry, you aren't authenticated` });
        }
      }

      return handler(user, context, req, res);
    } catch (err) {
      logger.error(err);
      return res.custom({ statusCode: 500 });
    }
  };
};
