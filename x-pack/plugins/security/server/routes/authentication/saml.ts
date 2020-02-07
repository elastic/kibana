/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SAMLLoginStep } from '../../authentication';
import { createCustomResourceResponse } from '.';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for SAML authentication.
 */
export function defineSAMLRoutes({ router, logger, authc, csp, basePath }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/saml/capture-url-fragment',
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
          <script src="${basePath.serverBasePath}/api/security/saml/capture-url-fragment.js"></script>
        `,
          'text/html',
          csp.header
        )
      );
    }
  );

  router.get(
    {
      path: '/api/security/saml/capture-url-fragment.js',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      return response.custom(
        createCustomResourceResponse(
          `
          window.location.replace(
            '${basePath.serverBasePath}/api/security/saml/start?redirectURLFragment=' + encodeURIComponent(window.location.hash)
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
      path: '/api/security/saml/start',
      validate: {
        query: schema.object({ redirectURLFragment: schema.string() }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      try {
        const authenticationResult = await authc.login(request, {
          provider: 'saml',
          value: {
            step: SAMLLoginStep.RedirectURLFragmentCaptured,
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

  router.post(
    {
      path: '/api/security/saml/callback',
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
