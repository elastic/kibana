/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SAMLLogin } from '../../authentication';
import { SAMLAuthenticationProvider } from '../../authentication/providers';
import { createCustomResourceResponse } from '.';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for SAML authentication.
 */
export function defineSAMLRoutes({ router, logger, authc, csp, basePath }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/saml/capture-url-fragment',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      // We're also preventing `favicon.ico` request since it can cause new SAML handshake.
      return response.custom(
        createCustomResourceResponse(
          `
          <!DOCTYPE html>
          <title>Kibana SAML Login</title>
          <link rel="icon" href="data:,">
          <script src="${basePath.serverBasePath}/internal/security/saml/capture-url-fragment.js"></script>
        `,
          'text/html',
          csp.header
        )
      );
    }
  );

  router.get(
    {
      path: '/internal/security/saml/capture-url-fragment.js',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      return response.custom(
        createCustomResourceResponse(
          `
          window.location.replace(
            '${basePath.serverBasePath}/internal/security/saml/start?redirectURLFragment=' + encodeURIComponent(window.location.hash)
          );
        `,
          'text/javascript',
          csp.header
        )
      );
    }
  );

  router.get(
    {
      path: '/internal/security/saml/start',
      validate: {
        query: schema.object({ redirectURLFragment: schema.string() }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      try {
        const authenticationResult = await authc.login(request, {
          provider: { type: SAMLAuthenticationProvider.type },
          value: {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURLFragment: request.query.redirectURLFragment,
          },
        });

        // When authenticating using SAML we _expect_ to redirect to the SAML Identity provider.
        if (authenticationResult.redirected()) {
          return response.redirected({ headers: { location: authenticationResult.redirectURL! } });
        }

        return response.unauthorized();
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );

  // Generate two identical routes with new and deprecated URL and issue a warning if route with
  // deprecated URL is ever used.
  for (const path of ['/api/security/saml/callback', '/api/security/v1/saml']) {
    router.post(
      {
        path,
        validate: {
          body: schema.object({
            SAMLResponse: schema.string(),
            RelayState: schema.maybe(schema.string()),
          }),
        },
        options: { authRequired: false, xsrfRequired: false },
      },
      async (context, request, response) => {
        if (path === '/api/security/v1/saml') {
          const serverBasePath = basePath.serverBasePath;
          logger.warn(
            `The "${serverBasePath}${path}" URL is deprecated and will stop working in the next major version, please use "${serverBasePath}/api/security/saml/callback" URL instead.`,
            { tags: ['deprecation'] }
          );
        }

        try {
          // When authenticating using SAML we _expect_ to redirect to the Kibana target location.
          const authenticationResult = await authc.login(request, {
            provider: { type: SAMLAuthenticationProvider.type },
            value: {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: request.body.SAMLResponse,
            },
          });

          if (authenticationResult.redirected()) {
            return response.redirected({
              headers: { location: authenticationResult.redirectURL! },
            });
          }

          return response.unauthorized({ body: authenticationResult.error });
        } catch (err) {
          logger.error(err);
          return response.internalError();
        }
      }
    );
  }
}
