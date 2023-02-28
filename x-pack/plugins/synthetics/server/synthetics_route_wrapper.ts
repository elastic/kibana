/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import { SYNTHETICS_INDEX_PATTERN } from '../common/constants';
import { isTestUser, UptimeEsClient } from './legacy_uptime/lib/lib';
import { syntheticsServiceApiKey } from './legacy_uptime/lib/saved_objects/service_api_key';
import { SyntheticsRouteWrapper, SyntheticsStreamingRouteHandler } from './legacy_uptime/routes';

export const syntheticsRouteWrapper: SyntheticsRouteWrapper = (
  uptimeRoute,
  server,
  syntheticsMonitorClient
) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
    ...(uptimeRoute.options ?? {}),
  },
  streamHandler: async (context, request, subject) => {
    const coreContext = await context.core;
    const { client: esClient } = coreContext.elasticsearch;
    const savedObjectsClient = coreContext.savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const uptimeEsClient = new UptimeEsClient(savedObjectsClient, esClient.asCurrentUser, {
      request,
      isDev: false,
      uiSettings: coreContext.uiSettings,
    });

    server.uptimeEsClient = uptimeEsClient;

    const res = await (uptimeRoute.handler as SyntheticsStreamingRouteHandler)({
      uptimeEsClient,
      savedObjectsClient,
      context,
      request,
      server,
      syntheticsMonitorClient,
      subject,
    });

    return res;
  },
  handler: async (context, request, response) => {
    const { elasticsearch, savedObjects, uiSettings } = await context.core;

    const { client: esClient } = elasticsearch;
    const savedObjectsClient = savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const uptimeEsClient = new UptimeEsClient(savedObjectsClient, esClient.asCurrentUser, {
      request,
      uiSettings,
      isDev: Boolean(server.isDev) && !isTestUser(server),
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });

    server.uptimeEsClient = uptimeEsClient;

    try {
      const res = await uptimeRoute.handler({
        uptimeEsClient,
        savedObjectsClient,
        context,
        request,
        response,
        server,
        syntheticsMonitorClient,
      });
      if (res instanceof KibanaResponse) {
        return res;
      }

      return response.ok({
        body: {
          ...res,
          ...(await uptimeEsClient.getInspectData(uptimeRoute.path)),
        },
      });
    } catch (e) {
      if (e.statusCode === 403) {
        return response.unauthorized({
          body: {
            message: e.message,
          },
        });
      }
    }
  },
});
