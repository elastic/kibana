/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Logged Out view.
 */
export function defineLoggedOutRoutes({
  router,
  logger,
  authc,
  csp,
  basePath,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/security/logged_out',
      validate: false,
      options: { authRequired: false },
    },
    async (context, request, response) => {
      // Authentication flow isn't triggered automatically for this route, so we should explicitly
      // check whether user has an active session already.
      const isUserAlreadyLoggedIn = (await authc.getSessionInfo(request)) !== null;
      if (isUserAlreadyLoggedIn) {
        logger.debug('User is already authenticated, redirecting...');
        return response.redirected({
          headers: { location: `${basePath.serverBasePath}/` },
        });
      }

      return response.ok({
        body: await context.core.rendering.render({ includeUserSettings: false }),
        headers: { 'content-security-policy': csp.header },
      });
    }
  );
}
