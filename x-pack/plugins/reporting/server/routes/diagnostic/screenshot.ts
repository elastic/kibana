/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { APP_WRAPPER_CLASS } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { generatePngObservable } from '../../export_types/common';
import { getAbsoluteUrlFactory } from '../../export_types/common/get_absolute_url';
import { PngCore } from '../../export_types/png/types';
import { getCounters, RequestHandler } from '../lib';
import { RequestHandlerUser } from '../lib/authorized_user_pre_routing';

const path = `${API_DIAGNOSE_URL}/screenshot`;

export const authorizedUserPreRoutingPng = <P, Q, B>(
  reporting: PngCore,
  handler: RequestHandlerUser<P, Q, B>
): RequestHandler<P, Q, B, ReportingRequestHandlerContext, RouteMethod> => {
  const { logger, security, docLinks } = reporting;

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

export const registerDiagnoseScreenshot = (reporting: PngCore, logger: Logger) => {
  const { router } = reporting;

  router.post(
    { path, validate: {} },
    authorizedUserPreRoutingPng(reporting, async (_user, _context, req, res) => {
      const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

      const { basePath, protocol, hostname, port } = reporting.getServerInfo();
      const getAbsoluteUrl = getAbsoluteUrlFactory({ basePath, protocol, hostname, port });
      const hashUrl = getAbsoluteUrl({ path: '/', hash: '', search: '' });

      // Hack the layout to make the base/login page work
      const layout = {
        dimensions: {
          width: 1440,
          height: 2024,
        },
        selectors: {
          screenshot: `.${APP_WRAPPER_CLASS}`,
          renderComplete: `.${APP_WRAPPER_CLASS}`,
          itemsCountAttribute: 'data-test-subj="kibanaChrome"',
          timefilterDurationAttribute: 'data-test-subj="kibanaChrome"',
        },
      };

      const reportingPng = reporting as unknown as PngCore;

      return lastValueFrom(
        generatePngObservable(reportingPng, logger, {
          layout,
          request: req,
          browserTimezone: 'America/Los_Angeles',
          urls: [hashUrl],
        })
          // Pipe is required to ensure that we can subscribe to it
          .pipe()
      )
        .then((screenshot) => {
          counters.usageCounter();

          // NOTE: the screenshot could be returned as a string using `data:image/png;base64,` + results.buffer.toString('base64')
          if (screenshot.warnings.length) {
            return res.ok({
              body: {
                success: false,
                help: [],
                logs: screenshot.warnings,
              },
            });
          }
          return res.ok({
            body: {
              success: true,
              help: [],
              logs: '',
            },
          });
        })
        .catch((error) => {
          counters.errorCounter();
          return res.ok({
            body: {
              success: false,
              help: [
                i18n.translate('xpack.reporting.diagnostic.screenshotFailureMessage', {
                  defaultMessage: `We couldn't screenshot your Kibana install.`,
                }),
              ],
              logs: error.message,
            },
          });
        });
    })
  );
};
