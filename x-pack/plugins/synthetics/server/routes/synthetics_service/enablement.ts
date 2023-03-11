/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { syntheticsServiceAPIKeySavedObject } from '../../legacy_uptime/lib/saved_objects/service_api_key';
import {
  SyntheticsRestApiRouteFactory,
  UMRestApiRouteFactory,
} from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import {
  generateAndSaveServiceAPIKey,
  SyntheticsForbiddenError,
} from '../../synthetics_service/get_api_key';

export const getSyntheticsEnablementRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ response, server }): Promise<any> => {
    try {
      return response.ok({
        body: await libs.requests.getSyntheticsEnablement({
          server,
        }),
      });
    } catch (e) {
      server.logger.error(e);
      throw e;
    }
  },
});

export const disableSyntheticsRoute: SyntheticsRestApiRouteFactory = (libs) => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({
    response,
    request,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
  }): Promise<any> => {
    const { security } = server;
    const { syntheticsService } = syntheticsMonitorClient;
    try {
      const { canEnable } = await libs.requests.getSyntheticsEnablement({ server });
      if (!canEnable) {
        return response.forbidden();
      }
      await syntheticsService.deleteAllConfigs();
      const { apiKey } = await libs.requests.getAPIKeyForSyntheticsService({
        server,
      });
      await syntheticsServiceAPIKeySavedObject.delete(savedObjectsClient);
      await security.authc.apiKeys?.invalidate(request, { ids: [apiKey?.id || ''] });
      return response.ok({});
    } catch (e) {
      server.logger.error(e);
      throw e;
    }
  },
});

export const enableSyntheticsRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'POST',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ request, response, server }): Promise<any> => {
    const { authSavedObjectsClient, logger } = server;
    try {
      await generateAndSaveServiceAPIKey({
        request,
        authSavedObjectsClient,
        server,
      });
      return response.ok({
        body: await libs.requests.getSyntheticsEnablement({
          server,
        }),
      });
    } catch (e) {
      logger.error(e);
      if (e instanceof SyntheticsForbiddenError) {
        return response.forbidden();
      }
      throw e;
    }
  },
});
