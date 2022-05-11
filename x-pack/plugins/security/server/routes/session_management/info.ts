/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { SESSION_EXPIRATION_WARNING_MS } from '../../../common/constants';
import type { SessionInfo } from '../../../common/types';

/**
 * Defines routes required for the session info.
 */
export function defineSessionInfoRoutes({ router, getSession }: RouteDefinitionParams) {
  router.get(
    { path: '/internal/security/session', validate: false },
    async (_context, request, response) => {
      const sessionValue = await getSession().get(request);
      if (sessionValue) {
        const expirationTime =
          sessionValue.idleTimeoutExpiration && sessionValue.lifespanExpiration
            ? Math.min(sessionValue.idleTimeoutExpiration, sessionValue.lifespanExpiration)
            : sessionValue.idleTimeoutExpiration || sessionValue.lifespanExpiration;

        return response.ok({
          body: {
            expiresInMs: expirationTime ? expirationTime - Date.now() : null,
            canBeExtended:
              sessionValue.idleTimeoutExpiration !== null &&
              expirationTime !== null &&
              (sessionValue.lifespanExpiration === null ||
                expirationTime + SESSION_EXPIRATION_WARNING_MS < sessionValue.lifespanExpiration),
            provider: sessionValue.provider,
          } as SessionInfo,
        });
      }

      return response.noContent();
    }
  );
}
