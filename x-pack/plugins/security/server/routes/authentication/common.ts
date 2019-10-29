/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionInfo } from '../../../public/types';
import { RouteDefinitionParams } from '..';

export function defineCommonRoutes({ router, logger, authc }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/session/info',
      validate: false,
      options: { extendsSession: false },
    },
    async (_context, request, response) => {
      try {
        const sessionInfo = await authc.sessionInfo(request);
        // This is an authenticated request, so sessionInfo will always be non-null.
        const { expires, maxExpires } = sessionInfo!;
        const now = new Date().getTime();
        // We can't rely on the client's system clock, so in addition to returning expiration timestamps, we also return
        // the current server time -- that way the client can calculate the relative time to expiration.
        const body: SessionInfo = {
          now,
          expires,
          maxExpires,
        };
        return response.ok({ body });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );
}
