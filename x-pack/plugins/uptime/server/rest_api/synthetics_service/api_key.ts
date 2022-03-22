/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';

export const canEnableSyntheticsRoute: UMRestApiRouteFactory = (libs) => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_ENABLEMENT,
  validate: {},
  handler: async ({ request, response, server }): Promise<any> => {
    try {
      return response.ok({
        body: await libs.requests.canEnableSynthetics({
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
  handler: async ({ response, server, savedObjectsClient }): Promise<any> => {
    await libs.requests.deleteServiceApiKey({
      savedObjectsClient,
    });
    try {
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
  handler: async ({
    request,
    response,
    server: { authSavedObjectsClient, logger, security },
  }): Promise<any> => {
    await libs.requests.generateAndSaveServiceAPIKey({
      request,
      authSavedObjectsClient,
      security,
    });
    try {
      return response.ok({});
    } catch (e) {
      logger.error(e);
      throw e;
    }
  },
});
