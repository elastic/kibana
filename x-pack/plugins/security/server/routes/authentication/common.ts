/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { parseNextURL } from '@kbn/std';

import type { RouteDefinitionParams } from '..';
import {
  BasicAuthenticationProvider,
  canRedirectRequest,
  OIDCAuthenticationProvider,
  OIDCLogin,
  SAMLAuthenticationProvider,
  SAMLLogin,
  TokenAuthenticationProvider,
} from '../../authentication';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { ROUTE_TAG_AUTH_FLOW, ROUTE_TAG_CAN_REDIRECT } from '../tags';

/**
 * Defines routes that are common to various authentication mechanisms.
 */
export function defineCommonRoutes({
  router,
  getAuthenticationService,
  basePath,
  license,
  logger,
  buildFlavor,
  docLinks,
}: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  // For a serverless build, do not register deprecated versioned routes
  for (const path of [
    '/api/security/logout',
    ...(buildFlavor !== 'serverless' ? ['/api/security/v1/logout'] : []),
  ]) {
    const isDeprecated = path === '/api/security/v1/logout';
    router.get(
      {
        path,
        security: {
          authz: {
            enabled: false,
            reason: 'This route must remain accessible to 3rd-party IdPs',
          },
        },
        // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
        // set of query string parameters (e.g. SAML/OIDC logout request/response parameters).
        validate: { query: schema.object({}, { unknowns: 'allow' }) },
        options: {
          access: 'public',
          excludeFromOAS: true,
          authRequired: false,
          tags: [ROUTE_TAG_CAN_REDIRECT, ROUTE_TAG_AUTH_FLOW],
          ...(isDeprecated && {
            deprecated: {
              documentationUrl: docLinks.links.security.deprecatedV1Endpoints,
              severity: 'warning',
              message: i18n.translate('xpack.security.deprecations.logoutRouteMessage', {
                defaultMessage:
                  'The "{path}" URL is deprecated and will be removed in the next major version. Use "/api/security/logout" instead.',
                values: { path },
              }),
              reason: {
                type: 'migrate',
                newApiMethod: 'GET',
                newApiPath: '/api/security/logout',
              },
            },
          }),
        },
      },
      async (context, request, response) => {
        const serverBasePath = basePath.serverBasePath;
        if (isDeprecated) {
          logger.warn(
            `The "${serverBasePath}${path}" URL is deprecated and will stop working in the next major version. Use "${serverBasePath}/api/security/logout" URL instead.`,
            { tags: ['deprecation'] }
          );
        }

        if (!canRedirectRequest(request)) {
          return response.badRequest({
            body: 'Client should be able to process redirect response.',
          });
        }

        try {
          const deauthenticationResult = await getAuthenticationService().logout(request);
          if (deauthenticationResult.failed()) {
            return response.customError(wrapIntoCustomErrorResponse(deauthenticationResult.error));
          }

          return response.redirected({
            headers: { location: deauthenticationResult.redirectURL || `${serverBasePath}/` },
          });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      }
    );
  }

  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  // For a serverless build, do not register deprecated versioned routes
  for (const path of [
    '/internal/security/me',
    ...(buildFlavor !== 'serverless' ? ['/api/security/v1/me'] : []),
  ]) {
    const isDeprecated = path === '/api/security/v1/me';
    router.get(
      {
        path,
        security: {
          authz: {
            enabled: false,
            reason: `This route delegates authorization to Core's security service; there must be an authenticated user for this route to return information`,
          },
        },
        validate: false,
        options: {
          access: isDeprecated ? 'public' : 'internal',
          ...(isDeprecated && {
            deprecated: {
              documentationUrl: docLinks.links.security.deprecatedV1Endpoints,
              severity: 'warning',
              message: i18n.translate('xpack.security.deprecations.meRouteMessage', {
                defaultMessage:
                  'The "{path}" endpoint is deprecated and will be removed in the next major version.',
                values: { path },
              }),
              reason: { type: 'remove' },
            },
          }),
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        if (isDeprecated) {
          logger.warn(
            `The "${basePath.serverBasePath}${path}" endpoint is deprecated and will be removed in the next major version.`,
            { tags: ['deprecation'] }
          );
        }
        const { security: coreSecurity } = await context.core;
        return response.ok({ body: coreSecurity.authc.getCurrentUser()! });
      })
    );
  }

  const basicParamsSchema = schema.object({
    username: schema.string({ minLength: 1 }),
    password: schema.string({ minLength: 1 }),
  });

  function getLoginAttemptForProviderType<T extends string>(
    providerType: T,
    redirectURL: string,
    params: T extends 'basic' | 'token' ? TypeOf<typeof basicParamsSchema> : {}
  ) {
    if (providerType === SAMLAuthenticationProvider.type) {
      return { type: SAMLLogin.LoginInitiatedByUser, redirectURL };
    }

    if (providerType === OIDCAuthenticationProvider.type) {
      return { type: OIDCLogin.LoginInitiatedByUser, redirectURL };
    }

    if (
      providerType === BasicAuthenticationProvider.type ||
      providerType === TokenAuthenticationProvider.type
    ) {
      return params;
    }

    return undefined;
  }

  // Register the login route for serverless for the time being. Note: This route will move into the buildFlavor !== 'serverless' block below. See next line.
  // ToDo: In the serverless environment, we do not support API login - the only valid authentication type is SAML
  router.post(
    {
      path: '/internal/security/login',
      security: {
        authz: {
          enabled: false,
          reason: `This route provides basic and token login capbility, which is delegated to the internal authentication service`,
        },
      },
      validate: {
        body: schema.object({
          providerType: schema.string(),
          providerName: schema.string(),
          currentURL: schema.string(),
          params: schema.conditional(
            schema.siblingRef('providerType'),
            schema.oneOf([
              schema.literal(BasicAuthenticationProvider.type),
              schema.literal(TokenAuthenticationProvider.type),
            ]),
            basicParamsSchema,
            schema.never()
          ),
        }),
      },
      options: { authRequired: false },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { providerType, providerName, currentURL, params } = request.body;
      const redirectURL = parseNextURL(currentURL, basePath.serverBasePath);
      const authenticationResult = await getAuthenticationService().login(request, {
        provider: { name: providerName },
        redirectURL,
        value: getLoginAttemptForProviderType(providerType, redirectURL, params),
      });

      if (authenticationResult.redirected() || authenticationResult.succeeded()) {
        return response.ok({
          body: { location: authenticationResult.redirectURL || redirectURL },
          headers: authenticationResult.authResponseHeaders,
        });
      }

      return response.unauthorized({
        body: authenticationResult.error,
        headers: authenticationResult.authResponseHeaders,
      });
    })
  );

  if (buildFlavor !== 'serverless') {
    // In the serverless offering, the access agreement functionality isn't available.
    router.post(
      {
        path: '/internal/security/access_agreement/acknowledge',
        security: {
          authz: {
            enabled: false,
            reason: `This route delegates authorization to the internal authentication service; there must be an authenticated user for this route to function`,
          },
        },
        validate: false,
      },
      createLicensedRouteHandler(async (context, request, response) => {
        // If license doesn't allow access agreement we shouldn't handle request.
        if (!license.getFeatures().allowAccessAgreement) {
          logger.warn(`Attempted to acknowledge access agreement when license doesn't allow it.`);
          return response.forbidden({
            body: { message: `Current license doesn't support access agreement.` },
          });
        }

        await getAuthenticationService().acknowledgeAccessAgreement(request);

        return response.noContent();
      })
    );
  }
}
