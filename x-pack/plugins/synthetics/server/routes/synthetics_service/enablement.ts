/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { syntheticsServiceAPIKeySavedObject } from '../../legacy_uptime/lib/saved_objects/service_api_key';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { generateAndSaveServiceAPIKey } from '../../synthetics_service/get_api_key';

export const getSyntheticsEnablementRoute: SyntheticsRestApiRouteFactory = (libs) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    try {
      const result = await libs.requests.getSyntheticsEnablement({
        server,
      });
      const { canEnable, isEnabled } = result;
      const { security } = server;
      const { apiKey, isValid } = await libs.requests.getAPIKeyForSyntheticsService({
        server,
      });
      if (apiKey && !isValid) {
        await syntheticsServiceAPIKeySavedObject.delete(savedObjectsClient);
        await security.authc.apiKeys?.invalidateAsInternalUser({
          ids: [apiKey?.id || ''],
        });
      }
      const regenerationRequired = !isEnabled || !isValid;
      if (canEnable && regenerationRequired && server.config.service?.manifestUrl) {
        await generateAndSaveServiceAPIKey({
          request,
          authSavedObjectsClient: savedObjectsClient,
          server,
        });
      } else {
        return result;
      }

      return libs.requests.getSyntheticsEnablement({
        server,
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
      await security.authc.apiKeys?.invalidateAsInternalUser({ ids: [apiKey?.id || ''] });
      return response.ok({});
    } catch (e) {
      server.logger.error(e);
      throw e;
    }
  },
});
