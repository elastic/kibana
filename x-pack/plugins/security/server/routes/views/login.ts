/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import {
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
  NEXT_URL_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import { shouldProviderUseLoginForm } from '../../../common/model';
import { parseNext } from '../../../common/parse_next';

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
            [NEXT_URL_QUERY_STRING_PARAMETER]: schema.maybe(schema.string()),
            [LOGOUT_REASON_QUERY_STRING_PARAMETER]: schema.maybe(schema.string()),
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

      const providers = sortedProviders.map(({ type, name }) => {
        // Since `config.authc.sortedProviders` is based on `config.authc.providers` config we can
        // be sure that config is present for every provider in `config.authc.sortedProviders`.
        const { showInSelector, description, hint, icon } = config.authc.providers[type]?.[name]!;
        const usesLoginForm = shouldProviderUseLoginForm(type);
        return {
          type,
          name,
          usesLoginForm,
          showInSelector: showInSelector && (usesLoginForm || selector.enabled),
          description,
          hint,
          icon,
        };
      });

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
