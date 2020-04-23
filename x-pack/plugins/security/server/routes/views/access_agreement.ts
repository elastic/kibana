/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Access Notice view.
 */
export function defineAccessNoticeRoutes({
  authc,
  httpResources,
  config,
  router,
  logger,
}: RouteDefinitionParams) {
  httpResources.register(
    { path: '/security/access_notice', validate: false },
    async (context, request, response) => response.renderCoreApp()
  );

  router.get(
    { path: '/internal/security/access_notice/state', validate: false },
    async (context, request, response) => {
      // It's not guaranteed that we'll have session for the authenticated user (e.g. when user is
      // authenticated with the help of HTTP authentication), that means we should safely check if
      // we have it and can get a corresponding configuration.
      try {
        const session = await authc.getSessionInfo(request);
        const accessNotice =
          (session &&
            (config.authc.providers as Record<string, any>)[session.provider.type]?.[
              session.provider.name
            ]?.accessNotice) ||
          '';

        return response.ok({ body: { accessNotice } });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );
}
