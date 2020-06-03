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
export function defineSAMLRoutes({ router, logger, authc }: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/saml/callback',
      validate: {
        body: schema.object(
          { SAMLResponse: schema.string(), RelayState: schema.maybe(schema.string()) },
          { unknowns: 'ignore' }
        ),
      },
      options: { authRequired: false, xsrfRequired: false },
    },
    async (context, request, response) => {
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
