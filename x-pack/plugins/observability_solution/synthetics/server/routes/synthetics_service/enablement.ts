/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsServiceAPIKeySavedObject } from '../../saved_objects/service_api_key';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  generateAndSaveServiceAPIKey,
  getAPIKeyForSyntheticsService,
  getSyntheticsEnablement,
} from '../../synthetics_service/get_api_key';

export const getSyntheticsEnablementRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT,
  writeAccess: false,
  validate: {},
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    try {
      const result = await getSyntheticsEnablement({
        server,
      });
      const { canEnable, isEnabled } = result;
      const { security } = server;
      const { apiKey, isValid } = await getAPIKeyForSyntheticsService({
        server,
      });
      if (apiKey && !isValid) {
        await syntheticsServiceAPIKeySavedObject.delete(savedObjectsClient);
        await security.authc.apiKeys?.invalidateAsInternalUser({
          ids: [apiKey?.id || ''],
        });
      }
      const regenerationRequired = !isEnabled || !isValid;
      const shouldEnableApiKey =
        server.config.service?.manifestUrl || server.config.service?.devUrl;
      if (canEnable && regenerationRequired && shouldEnableApiKey) {
        await generateAndSaveServiceAPIKey({
          request,
          authSavedObjectsClient: savedObjectsClient,
          server,
        });
      } else {
        return result;
      }

      return getSyntheticsEnablement({
        server,
      });
    } catch (e) {
      server.logger.error(e);
      throw e;
    }
  },
});

export const disableSyntheticsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({
    response,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
  }): Promise<any> => {
    const { security } = server;
    const { syntheticsService } = syntheticsMonitorClient;
    try {
      const { canEnable } = await getSyntheticsEnablement({ server });
      if (!canEnable) {
        return response.forbidden();
      }
      await syntheticsService.deleteAllConfigs();
      const { apiKey } = await getAPIKeyForSyntheticsService({
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
