/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionInfo } from '../../../common/types';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the session info.
 */
export function defineSessionInfoRoutes({ router, logger, session }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/session',
      validate: false,
      // We have both authenticated and non-authenticated sessions.
      options: { authRequired: 'optional' },
    },
    async (_context, request, response) => {
      try {
        const sessionValue = await session.get(request);
        return response.ok(
          sessionValue
            ? {
                body: {
                  // We can't rely on the client's system clock, so in addition to returning expiration timestamps, we also return
                  // the current server time -- that way the client can calculate the relative time to expiration.
                  now: Date.now(),
                  idleTimeoutExpiration: sessionValue.idleTimeoutExpiration,
                  lifespanExpiration: sessionValue.lifespanExpiration,
                  provider: sessionValue.provider,
                } as SessionInfo,
              }
            : {}
        );
      } catch (err) {
        logger.error(`Error retrieving user session: ${err.message}`);
        return response.internalError();
      }
    }
  );
}
