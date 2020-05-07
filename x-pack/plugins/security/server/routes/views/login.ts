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
  httpResources,
  basePath,
  license,
}: RouteDefinitionParams) {
  httpResources.register(
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

      return response.renderAnonymousCoreApp();
    }
  );

  router.get(
    { path: '/internal/security/login_state', validate: false, options: { authRequired: false } },
    async (context, request, response) => {
      const { allowLogin, layout = 'form' } = license.getFeatures();
      const { sortedProviders, selector } = config.authc;

      const providers = [];
      for (const { type, name } of sortedProviders) {
        // Since `config.authc.sortedProviders` is based on `config.authc.providers` config we can
        // be sure that config is present for every provider in `config.authc.sortedProviders`.
        const { showInSelector, description, hint, icon } = config.authc.providers[type]?.[name]!;

        // Include provider into the list if either selector is enabled or provider uses login form.
        const usesLoginForm = type === 'basic' || type === 'token';
        if (showInSelector && (usesLoginForm || selector.enabled)) {
          providers.push({ type, name, usesLoginForm, description, hint, icon });
        }
      }

      const loginState: LoginState = {
        allowLogin,
        layout,
        requiresSecureConnection: config.secureCookies,
        loginHelp: config.loginHelp,
        selector: { enabled: selector.enabled, providers },
      };

      return response.ok({ body: loginState });
    }
  );
}
