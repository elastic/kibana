/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from 'src/core/server';

import { PLUGIN_ID, APP_API_ROUTES } from '../../constants';
import { appContextService } from '../../services';
import type { CheckPermissionsResponse, RegenerateServiceTokenResponse } from '../../../common';
import { defaultIngestErrorHandler, RegenerateServiceTokenError } from '../../errors';

const DEFAULT_FLEET_SERVER_SERVICE_TOKEN_NAME = 'default-fleet-server-token';

export const getCheckPermissionsHandler: RequestHandler = async (context, request, response) => {
  const body: CheckPermissionsResponse = { success: true };
  try {
    const security = await appContextService.getSecurity();
    const user = security.authc.getCurrentUser(request);

    if (!user?.roles.includes('superuser')) {
      body.success = false;
      body.error = 'MISSING_SUPERUSER_ROLE';
      return response.ok({
        body,
      });
    }

    return response.ok({ body: { success: true } });
  } catch (e) {
    body.success = false;
    body.error = 'MISSING_SECURITY';
    return response.ok({
      body,
    });
  }
};

export const regenerateServiceTokenHandler: RequestHandler = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    // Remove existing token
    await esClient.transport.request({
      method: 'DELETE',
      path: `_security/service/elastic/fleet-server/credential/token/${DEFAULT_FLEET_SERVER_SERVICE_TOKEN_NAME}`,
    });

    // Recreate it
    const { body: tokenResponse } = await esClient.transport.request({
      method: 'POST',
      path: `_security/service/elastic/fleet-server/credential/token/${DEFAULT_FLEET_SERVER_SERVICE_TOKEN_NAME}`,
    });

    if (tokenResponse.created && tokenResponse.token) {
      const body: RegenerateServiceTokenResponse = tokenResponse.token;
      return response.ok({
        body,
      });
    } else {
      const error = new RegenerateServiceTokenError('Unable to generate service token');
      return defaultIngestErrorHandler({ error, response });
    }
  } catch (e) {
    const error = new RegenerateServiceTokenError(e);
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
      path: APP_API_ROUTES.REGENERATE_SERVICE_TOKEN_PATTERN,
      validate: {},
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    regenerateServiceTokenHandler
  );
};
