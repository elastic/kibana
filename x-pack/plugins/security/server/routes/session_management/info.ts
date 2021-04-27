/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../';
import type { SessionInfo } from '../../../common/types';

/**
 * Defines routes required for the session info.
 */
export function defineSessionInfoRoutes({ router, getSession, config }: RouteDefinitionParams) {
  router.get(
    { path: '/internal/security/session', validate: false },
    async (_context, request, response) => {
      const sessionValue = await getSession().get(request);
      if (sessionValue) {
        const timeouts = config.session.getExpirationTimeouts(sessionValue.provider);
        return response.ok({
          body: {
            // We can't rely on the client's system clock, so in addition to returning expiration timestamps, we also return
            // the current server time -- that way the client can calculate the relative time to expiration.
            now: Date.now(),
            idleTimeout: timeouts.idleTimeout ? timeouts.idleTimeout.asMilliseconds() : null,
            idleTimeoutExpiration: sessionValue.idleTimeoutExpiration,
            lifespan: timeouts.lifespan ? timeouts.lifespan.asMilliseconds() : null,
            lifespanExpiration: sessionValue.lifespanExpiration,
            provider: sessionValue.provider,
          } as SessionInfo,
        });
      }

      return response.noContent();
    }
  );
}
