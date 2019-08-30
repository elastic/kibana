/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '.';
import { SAMLLoginStep } from '../authentication';

export function defineAuthenticationRoutes(params: RouteDefinitionParams) {
  if (params.config.authc.providers.includes('saml')) {
    defineSAMLRoutes(params);
  }
}

/**
 * Defines routes required for SAML authentication.
 */
function defineSAMLRoutes({ basePath, router, logger, authc }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/authc/saml/capture-current-url',
      validate: { query: schema.object({ currentPath: schema.string() }) },
      options: { authRequired: false },
    },
    (context, request, response) => {
      const { currentPath } = request.query;
      return response.custom({
        body: `
        <!DOCTYPE html>
        <title>Kibana SAML Login</title>
        <script>
          window.location.replace(
            '${basePath.get(
              request
            )}/security/api/authc/saml/start?currentURL=' + encodeURIComponent('${currentPath}' + window.location.hash)
          );
        </script>
      `,
        headers: {
          'content-type': 'text/html',
          'cache-control': 'private, no-cache, no-store',
          // HACK: inline scripts aren't allowed yet.
          // 'content-security-policy': getLegacyAPI().cspRules,
        },
        statusCode: 200,
      });
    }
  );

  router.get(
    {
      path: '/api/authc/saml/start',
      validate: { query: schema.object({ currentURL: schema.string() }) },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      try {
        const authenticationResult = await authc.login(request, {
          provider: 'saml',
          value: { step: SAMLLoginStep.UserURLCaptured, currentURL: request.query.currentURL },
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

  router.post(
    {
      path: '/api/authc/saml/callback',
      validate: {
        body: schema.object({
          SAMLResponse: schema.string(),
          RelayState: schema.maybe(schema.string()),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      try {
        // When authenticating using SAML we _expect_ to redirect to the SAML Identity provider.
        const authenticationResult = await authc.login(request, {
          provider: 'saml',
          value: {
            step: SAMLLoginStep.SAMLResponseReceived,
            samlResponse: request.body.SAMLResponse,
            nextURL: request.body.RelayState,
          },
        });

        if (authenticationResult.redirected()) {
          return response.redirected({ headers: { location: authenticationResult.redirectURL! } });
        }

        return response.unauthorized({ body: authenticationResult.error });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );
}
