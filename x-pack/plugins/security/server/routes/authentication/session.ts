/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for all authentication realms.
 */
export function defineSessionRoutes({ router, logger, authc, basePath }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/session',
      validate: false,
    },
    async (_context, request, response) => {
      try {
        const sessionInfo = await authc.getSessionInfo(request);
        // This is an authenticated request, so sessionInfo will always be non-null.
        return response.ok({ body: sessionInfo! });
      } catch (err) {
        logger.error(`Error retrieving user session: ${err.message}`);
        return response.internalError();
      }
    }
  );

  router.post(
    {
      path: '/internal/security/session',
      validate: false,
    },
    async (_context, _request, response) => {
      // We can't easily return updated session info in a single HTTP call, because session data is obtained from
      // the HTTP request, not the response. So the easiest way to facilitate this is to redirect the client to GET
      // the session endpoint after the client's session has been extended.
      return response.redirected({
        headers: {
          location: `${basePath.serverBasePath}/internal/security/session`,
        },
      });
    }
  );
}
