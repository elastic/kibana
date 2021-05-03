/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../';
import { parseNext } from '../../../common/parse_next';
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
}: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  for (const path of ['/api/security/logout', '/api/security/v1/logout']) {
    router.get(
      {
        path,
        // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
        // set of query string parameters (e.g. SAML/OIDC logout request/response parameters).
        validate: { query: schema.object({}, { unknowns: 'allow' }) },
        options: { authRequired: false, tags: [ROUTE_TAG_CAN_REDIRECT, ROUTE_TAG_AUTH_FLOW] },
      },
      async (context, request, response) => {
        const serverBasePath = basePath.serverBasePath;
        if (path === '/api/security/v1/logout') {
          logger.warn(
            `The "${serverBasePath}${path}" URL is deprecated and will stop working in the next major version, please use "${serverBasePath}/api/security/logout" URL instead.`,
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
  for (const path of ['/internal/security/me', '/api/security/v1/me']) {
    router.get(
      { path, validate: false },
      createLicensedRouteHandler((context, request, response) => {
        if (path === '/api/security/v1/me') {
          logger.warn(
            `The "${basePath.serverBasePath}${path}" endpoint is deprecated and will be removed in the next major version.`,
            { tags: ['deprecation'] }
          );
        }

        return response.ok({ body: getAuthenticationService().getCurrentUser(request)! });
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

  router.post(
    {
      path: '/internal/security/login',
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
      logger.info(`Logging in with provider "${providerName}" (${providerType})`);

      const redirectURL = parseNext(currentURL, basePath.serverBasePath);
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

  router.post(
    { path: '/internal/security/access_agreement/acknowledge', validate: false },
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
