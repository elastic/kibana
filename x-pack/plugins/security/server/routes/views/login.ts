/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { parseNext } from '../../../common/parse_next';
import { LoginState } from '../../../common/login_state';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Login view.
 */
export function defineLoginRoutes({
  config,
  router,
  logger,
  csp,
  basePath,
  license,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/login',
      validate: {
        query: schema.object(
          {
            next: schema.maybe(schema.string()),
            msg: schema.maybe(schema.string()),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { authRequired: 'optional' },
    },
    async (context, request, response) => {
      // Default to true if license isn't available or it can't be resolved for some reason.
      const shouldShowLogin = license.isEnabled() ? license.getFeatures().showLogin : true;
      const isUserAlreadyLoggedIn = request.auth.isAuthenticated;
      if (isUserAlreadyLoggedIn || !shouldShowLogin) {
        logger.debug('User is already authenticated, redirecting...');
        return response.redirected({
          headers: { location: parseNext(request.url?.href ?? '', basePath.serverBasePath) },
        });
      }

      return response.ok({
        body: await context.core.rendering.render({ includeUserSettings: false }),
        headers: { 'content-security-policy': csp.header },
      });
    }
  );

  router.get(
    { path: '/internal/security/login_state', validate: false, options: { authRequired: false } },
    async (context, request, response) => {
      const { allowLogin, layout = 'form' } = license.getFeatures();
      const { sortedProviders, selector } = config.authc;

      let showLoginForm = false;
      const providers = [];
      for (const { type, name, options } of sortedProviders) {
        if (options.showInSelector) {
          if (type === 'basic' || type === 'token') {
            showLoginForm = true;
          } else if (selector.enabled) {
            providers.push({ type, name, description: options.description });
          }
        }
      }

      const loginState: LoginState = {
        allowLogin,
        layout,
        requiresSecureConnection: config.secureCookies,
        showLoginForm,
        selector: { enabled: selector.enabled, providers },
      };

      return response.ok({ body: loginState });
    }
  );
}
