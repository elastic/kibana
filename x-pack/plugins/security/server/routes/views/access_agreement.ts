/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import type { ConfigType } from '../../config';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Defines routes required for the Access Agreement view.
 */
export function defineAccessAgreementRoutes({
  getSession,
  httpResources,
  license,
  config,
  router,
  logger,
}: RouteDefinitionParams) {
  // If license doesn't allow access agreement we shouldn't handle request.
  const canHandleRequest = () => license.getFeatures().allowAccessAgreement;

  httpResources.register(
    { path: '/security/access_agreement', validate: false },
    createLicensedRouteHandler(async (context, request, response) =>
      canHandleRequest()
        ? response.renderCoreApp()
        : response.forbidden({
            body: { message: `Current license doesn't support access agreement.` },
          })
    )
  );

  router.get(
    { path: '/internal/security/access_agreement/state', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      if (!canHandleRequest()) {
        return response.forbidden({
          body: { message: `Current license doesn't support access agreement.` },
        });
      }

      // It's not guaranteed that we'll have session for the authenticated user (e.g. when user is
      // authenticated with the help of HTTP authentication), that means we should safely check if
      // we have it and can get a corresponding configuration.
      const sessionValue = await getSession().get(request);
      const accessAgreement =
        (sessionValue &&
          config.authc.providers[
            sessionValue.provider.type as keyof ConfigType['authc']['providers']
          ]?.[sessionValue.provider.name]?.accessAgreement?.message) ||
        '';

      return response.ok({ body: { accessAgreement } });
    })
  );
}
