/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SAMLLogin } from '../../authentication';
import { SAMLAuthenticationProvider } from '../../authentication/providers';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for SAML authentication.
 */
export function defineSAMLRoutes({ router, logger, authc, basePath }: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with
  // deprecated URL is ever used.
  for (const path of ['/api/security/saml/callback', '/api/security/v1/saml']) {
    router.post(
      {
        path,
        validate: {
          body: schema.object(
            { SAMLResponse: schema.string(), RelayState: schema.maybe(schema.string()) },
            { unknowns: 'ignore' }
          ),
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
              relayState: request.body.RelayState,
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
