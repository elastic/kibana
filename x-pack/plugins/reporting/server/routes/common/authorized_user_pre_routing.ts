/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RouteMethod } from '@kbn/core/server';
import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { i18n } from '@kbn/i18n';
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
  const { logger, security, docLinks } = reporting.getPluginSetupDeps();

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
          const body = i18n.translate('xpack.reporting.userAccessError.message', {
            defaultMessage: `Ask your administrator for access to reporting features. {grantUserAccessDocs}.`,
            values: {
              grantUserAccessDocs:
                `<a href=${docLinks.links.reporting.grantUserAccess} style="font-weight: 600;"
                    target="_blank" rel="noopener">` +
                i18n.translate('xpack.reporting.userAccessError.learnMoreLink', {
                  defaultMessage: 'Learn more',
                }) +
                '</a>',
            },
          });
          // user's roles do not allow
          return res.forbidden({ body });
        }
      }

      return handler(user, context, req, res);
    } catch (err) {
      logger.error(err);
      return res.custom({ statusCode: 500 });
    }
  };
};
