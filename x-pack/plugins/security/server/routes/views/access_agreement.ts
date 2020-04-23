/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigType } from '../../config';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Access Agreement view.
 */
export function defineAccessAgreementRoutes({
  authc,
  httpResources,
  config,
  router,
  logger,
}: RouteDefinitionParams) {
  httpResources.register(
    { path: '/security/access_agreement', validate: false },
    async (context, request, response) => response.renderCoreApp()
  );

  router.get(
    { path: '/internal/security/access_agreement/state', validate: false },
    async (context, request, response) => {
      // It's not guaranteed that we'll have session for the authenticated user (e.g. when user is
      // authenticated with the help of HTTP authentication), that means we should safely check if
      // we have it and can get a corresponding configuration.
      try {
        const session = await authc.getSessionInfo(request);
        const accessAgreement =
          (session &&
            config.authc.providers[
              session.provider.type as keyof ConfigType['authc']['providers']
            ]?.[session.provider.name]?.accessAgreement?.message) ||
          '';

        return response.ok({ body: { accessAgreement } });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );
}
