/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the session extension.
 */
export function defineSessionExtendRoutes({ router, basePath }: RouteDefinitionParams) {
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
