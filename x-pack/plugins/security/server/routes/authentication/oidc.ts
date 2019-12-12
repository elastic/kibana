/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { KibanaRequest, KibanaResponseFactory } from '../../../../../../src/core/server';
import { OIDCAuthenticationFlow } from '../../authentication';
import { createCustomResourceResponse } from '.';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { ProviderLoginAttempt } from '../../authentication/providers/oidc';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for SAML authentication.
 */
export function defineOIDCRoutes({ router, authc, csp, basePath }: RouteDefinitionParams) {
  /**
   * The route should be configured as a redirect URI in OP when OpenID Connect implicit flow
   * is used, so that we can extract authentication response from URL fragment and send it to
   * the `/api/security/oidc/callback` route.
   */
  router.get(
    {
      path: '/api/security/oidc/implicit',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      return response.custom(
        createCustomResourceResponse(
          `
          <!DOCTYPE html>
          <title>Kibana OpenID Connect Login</title>
          <link rel="icon" href="data:,">
          <script src="${basePath.serverBasePath}/internal/security/oidc/implicit.js"></script>
        `,
          'text/html',
          csp.header
        )
      );
    }
  );

  /**
   * The route that accompanies `/api/security/oidc/implicit` and renders a JavaScript snippet
   * that extracts fragment part from the URL and send it to the `/api/security/oidc/callback` route.
   * We need this separate endpoint because of default CSP policy that forbids inline scripts.
   */
  router.get(
    {
      path: '/internal/security/oidc/implicit.js',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => {
      const serverBasePath = basePath.serverBasePath;
      return response.custom(
        createCustomResourceResponse(
          `
          window.location.replace(
            '${serverBasePath}/api/security/oidc/callback?authenticationResponseURI=' + encodeURIComponent(window.location.href)
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
      path: '/api/security/oidc/callback',
      validate: {
        query: schema.object(
          {
            authenticationResponseURI: schema.maybe(schema.uri()),
            code: schema.maybe(schema.string()),
            error: schema.maybe(schema.string()),
            error_description: schema.maybe(schema.string()),
            error_uri: schema.maybe(schema.uri()),
            state: schema.maybe(schema.string()),
          },
          // The client MUST ignore unrecognized response parameters according to
          // https://openid.net/specs/openid-connect-core-1_0.html#AuthResponseValidation and
          // https://tools.ietf.org/html/rfc6749#section-4.1.2.
          { allowUnknowns: true }
        ),
      },
      options: { authRequired: false },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      // An HTTP GET request with a query parameter named `authenticationResponseURI` that includes URL fragment OpenID
      // Connect Provider sent during implicit authentication flow to the Kibana own proxy page that extracted that URL
      // fragment and put it into `authenticationResponseURI` query string parameter for this endpoint. See more details
      // at https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth
      let loginAttempt: ProviderLoginAttempt | undefined;
      if (request.query.authenticationResponseURI) {
        loginAttempt = {
          flow: OIDCAuthenticationFlow.Implicit,
          authenticationResponseURI: request.query.authenticationResponseURI,
        };
      } else if (request.query.code || request.query.error) {
        // An HTTP GET request with a query parameter named `code` (or `error`) as the response to a successful (or
        // failed) authentication from an OpenID Connect Provider during authorization code authentication flow.
        // See more details at https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth.
        loginAttempt = {
          flow: OIDCAuthenticationFlow.AuthorizationCode,
          //  We pass the path only as we can't be sure of the full URL and Elasticsearch doesn't need it anyway.
          authenticationResponseURI: request.url.path!,
        };
      }

      if (!loginAttempt) {
        return response.badRequest({ body: 'Unrecognized login attempt.' });
      }

      return performOIDCLogin(request, response, loginAttempt);
    })
  );

  const initiateLoginRouteParameters = {
    path: '/api/security/oidc/initiate_login',
    validate: schema.object(
      {
        iss: schema.uri({ scheme: ['https'] }),
        login_hint: schema.maybe(schema.string()),
        target_link_uri: schema.maybe(schema.uri()),
      },
      // Other parameters MAY be sent, if defined by extensions. Any parameters used that are not understood MUST
      // be ignored by the Client according to https://openid.net/specs/openid-connect-core-1_0.html#ThirdPartyInitiatedLogin.
      { allowUnknowns: true }
    ),
    options: { authRequired: false },
  };

  /**
   * An HTTP POST request with the payload parameter named `iss` as part of a 3rd party initiated authentication.
   * See more details at https://openid.net/specs/openid-connect-core-1_0.html#ThirdPartyInitiatedLogin
   */
  router.post(
    { ...initiateLoginRouteParameters, validate: { body: initiateLoginRouteParameters.validate } },
    createLicensedRouteHandler(async (context, request, response) => {
      return performOIDCLogin(request, response, {
        flow: OIDCAuthenticationFlow.InitiatedBy3rdParty,
        iss: request.body.iss,
        loginHint: request.body.login_hint,
      });
    })
  );

  /**
   * An HTTP GET request with the query string parameter named `iss` as part of a 3rd party initiated authentication.
   * See more details at https://openid.net/specs/openid-connect-core-1_0.html#ThirdPartyInitiatedLogin
   */
  router.get(
    { ...initiateLoginRouteParameters, validate: { query: initiateLoginRouteParameters.validate } },
    createLicensedRouteHandler(async (context, request, response) => {
      return performOIDCLogin(request, response, {
        flow: OIDCAuthenticationFlow.InitiatedBy3rdParty,
        iss: request.query.iss,
        loginHint: request.query.login_hint,
      });
    })
  );

  async function performOIDCLogin(
    request: KibanaRequest,
    response: KibanaResponseFactory,
    loginAttempt: ProviderLoginAttempt
  ) {
    try {
      // We handle the fact that the user might get redirected to Kibana while already having a session
      // Return an error notifying the user they are already logged in.
      const authenticationResult = await authc.login(request, {
        provider: 'oidc',
        value: loginAttempt,
      });

      if (authenticationResult.succeeded()) {
        return response.forbidden({
          body: i18n.translate('xpack.security.conflictingSessionError', {
            defaultMessage:
              'Sorry, you already have an active Kibana session. ' +
              'If you want to start a new one, please logout from the existing session first.',
          }),
        });
      }

      if (authenticationResult.redirected()) {
        return response.redirected({
          headers: { location: authenticationResult.redirectURL! },
        });
      }

      return response.unauthorized({ body: authenticationResult.error });
    } catch (error) {
      return response.customError(wrapIntoCustomErrorResponse(error));
    }
  }
}
