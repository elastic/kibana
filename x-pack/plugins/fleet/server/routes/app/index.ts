/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RequestHandler } from '../../../../../../src/core/server/http/router/router';
import { PLUGIN_ID } from '../../../common/constants/plugin';
import { APP_API_ROUTES } from '../../../common/constants/routes';
import type {
  CheckPermissionsResponse,
  GenerateServiceTokenResponse,
} from '../../../common/types/rest_spec/app';
import { GenerateServiceTokenError } from '../../errors';
import { defaultIngestErrorHandler } from '../../errors/handlers';
import { appContextService } from '../../services/app_context';

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

export const generateServiceTokenHandler: RequestHandler = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    const { body: tokenResponse } = await esClient.transport.request({
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
};
