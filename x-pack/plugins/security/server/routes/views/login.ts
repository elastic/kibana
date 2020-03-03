/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { parseNext } from '../../../common/parse_next';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Login view.
 */
export function defineLoginRoutes({
  router,
  logger,
  authc,
  csp,
  basePath,
  license,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/login',
      validate: {
        query: schema.object(
          {
            next: schema.maybe(schema.string()),
            msg: schema.maybe(schema.string()),
          },
          { allowUnknowns: true }
        ),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      // Default to true if license isn't available or it can't be resolved for some reason.
      const shouldShowLogin = license.isEnabled() ? license.getFeatures().showLogin : true;

      // Authentication flow isn't triggered automatically for this route, so we should explicitly
      // check whether user has an active session already.
      const isUserAlreadyLoggedIn = (await authc.getSessionInfo(request)) !== null;
      if (isUserAlreadyLoggedIn || !shouldShowLogin) {
        logger.debug('User is already authenticated, redirecting...');
        return response.redirected({
          headers: { location: parseNext(request.url?.href ?? '', basePath.serverBasePath) },
        });
      }

      return response.ok({
        body: await context.core.rendering.render({ includeUserSettings: false }),
        headers: { 'content-security-policy': csp.header },
      });
    }
  );

  router.get(
    { path: '/internal/security/login_state', validate: false, options: { authRequired: false } },
    async (context, request, response) => {
      const { showLogin, allowLogin, layout = 'form' } = license.getFeatures();
      return response.ok({ body: { showLogin, allowLogin, layout } });
    }
  );
}
