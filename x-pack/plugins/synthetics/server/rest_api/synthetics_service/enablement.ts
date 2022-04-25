/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { SyntheticsForbiddenError } from '../../lib/synthetics_service/get_api_key';

export const getSyntheticsEnablementRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ request, response, server }): Promise<any> => {
    try {
      return response.ok({
        body: await libs.requests.getSyntheticsEnablement({
          request,
          server,
        }),
      });
    } catch (e) {
      server.logger.error(e);
      throw e;
    }
  },
});

export const disableSyntheticsRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ response, request, server, savedObjectsClient }): Promise<any> => {
    const { syntheticsService, security } = server;
    try {
      const { canEnable } = await libs.requests.getSyntheticsEnablement({ request, server });
      if (!canEnable) {
        return response.forbidden();
      }
      await syntheticsService.deleteAllConfigs();
      const apiKey = await libs.requests.getAPIKeyForSyntheticsService({
        server,
      });
      await libs.requests.deleteServiceApiKey({
        request,
        server,
        savedObjectsClient,
      });
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
    const { authSavedObjectsClient, logger, security } = server;
    try {
      await libs.requests.generateAndSaveServiceAPIKey({
        request,
        authSavedObjectsClient,
        security,
        server,
      });
      return response.ok({});
    } catch (e) {
      logger.error(e);
      if (e instanceof SyntheticsForbiddenError) {
        return response.forbidden();
      }
      throw e;
    }
  },
});
