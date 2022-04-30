/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from 'src/core/server';

import { PLUGIN_ID, APP_API_ROUTES } from '../../constants';
import { appContextService } from '../../services';
import type { CheckPermissionsResponse, GenerateServiceTokenResponse } from '../../../common';
import { defaultIngestErrorHandler, GenerateServiceTokenError } from '../../errors';

export const getCheckPermissionsHandler: RequestHandler = async (context, request, response) => {
  const missingSecurityBody: CheckPermissionsResponse = {
    success: false,
    error: 'MISSING_SECURITY',
  };

  if (!appContextService.getSecurityLicense().isEnabled()) {
    return response.ok({ body: missingSecurityBody });
  } else {
    const security = appContextService.getSecurity();
    const user = security.authc.getCurrentUser(request);

    // Defensively handle situation where user is undefined (should only happen when ES security is disabled)
    // This should be covered by the `getSecurityLicense().isEnabled()` check above, but we leave this for robustness.
    if (!user) {
      return response.ok({
        body: missingSecurityBody,
      });
    }

    if (!user?.roles.includes('superuser')) {
      return response.ok({
        body: {
          success: false,
          error: 'MISSING_SUPERUSER_ROLE',
        } as CheckPermissionsResponse,
      });
    }

    return response.ok({ body: { success: true } as CheckPermissionsResponse });
  }
};

export const generateServiceTokenHandler: RequestHandler = async (context, request, response) => {
  // Generate the fleet server service token as the current user as the internal user do not have the correct permissions
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    const { body: tokenResponse } = await esClient.transport.request<{
      created?: boolean;
      token?: GenerateServiceTokenResponse;
    }>({
      method: 'POST',
      path: `_security/service/elastic/fleet-server/credential/token/token-${Date.now()}`,
    });

    if (tokenResponse.created && tokenResponse.token) {
      const body: GenerateServiceTokenResponse = tokenResponse.token;
      return response.ok({
        body,
      });
    } else {
      const error = new GenerateServiceTokenError('Unable to generate service token');
      return defaultIngestErrorHandler({ error, response });
    }
  } catch (e) {
    const error = new GenerateServiceTokenError(e);
    return defaultIngestErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: APP_API_ROUTES.CHECK_PERMISSIONS_PATTERN,
      validate: {},
      options: { tags: [] },
    },
    getCheckPermissionsHandler
  );

  router.post(
    {
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
      validate: {},
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    generateServiceTokenHandler
  );

  router.post(
    {
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN_DEPRECATED,
      validate: {},
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    generateServiceTokenHandler
  );
};
