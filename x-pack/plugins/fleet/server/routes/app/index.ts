/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';

import { APP_API_ROUTES } from '../../constants';
import { appContextService } from '../../services';
import type { CheckPermissionsResponse, GenerateServiceTokenResponse } from '../../../common';
import { defaultIngestErrorHandler, GenerateServiceTokenError } from '../../errors';
import type { FleetAuthzRouter } from '../security';
import type { FleetRequestHandler } from '../../types';

export const getCheckPermissionsHandler: FleetRequestHandler = async (
  context,
  request,
  response
) => {
  const missingSecurityBody: CheckPermissionsResponse = {
    success: false,
    error: 'MISSING_SECURITY',
  };

  if (!appContextService.getSecurityLicense().isEnabled()) {
    return response.ok({ body: missingSecurityBody });
  } else {
    if (!context.fleet.authz.fleet.all) {
      return response.ok({
        body: {
          success: false,
          error: 'MISSING_PRIVILEGES',
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

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: APP_API_ROUTES.CHECK_PERMISSIONS_PATTERN,
      validate: {},
      options: { tags: [] },
      // no permission check for that route
    },
    getCheckPermissionsHandler
  );

  router.post(
    {
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
      validate: {},
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    generateServiceTokenHandler
  );

  router.post(
    {
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN_DEPRECATED,
      validate: {},
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    generateServiceTokenHandler
  );
};
