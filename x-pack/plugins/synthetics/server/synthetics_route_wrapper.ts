/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { createUptimeESClient, inspectableEsQueriesMap } from './legacy_uptime/lib/lib';
import { syntheticsServiceApiKey } from './legacy_uptime/lib/saved_objects/service_api_key';
import { SyntheticsRouteWrapper, SyntheticsStreamingRouteHandler } from './legacy_uptime/routes';
import { API_URLS } from '../common/constants';

export const syntheticsRouteWrapper: SyntheticsRouteWrapper = (
  uptimeRoute,
  server,
  syntheticsMonitorClient
) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
  },
  streamHandler: async (context, request, subject) => {
    const coreContext = await context.core;
    const { client: esClient } = coreContext.elasticsearch;
    const savedObjectsClient = coreContext.savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const isInspectorEnabled = await coreContext.uiSettings.client.get<boolean>(
      enableInspectEsQueries
    );

    const uptimeEsClient = createUptimeESClient({
      request,
      savedObjectsClient,
      isInspectorEnabled,
      esClient: esClient.asCurrentUser,
    });

    server.uptimeEsClient = uptimeEsClient;

    if (
      (isInspectorEnabled || server.isDev) &&
      server.config.service?.username !== 'localKibanaIntegrationTestsUser'
    ) {
      inspectableEsQueriesMap.set(request, []);
    }

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
    const coreContext = await context.core;
    const { client: esClient } = coreContext.elasticsearch;
    const savedObjectsClient = coreContext.savedObjects.getClient({
      includedHiddenTypes: [syntheticsServiceApiKey.name],
    });

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const isInspectorEnabled = await coreContext.uiSettings.client.get<boolean>(
      enableInspectEsQueries
    );

    const uptimeEsClient = createUptimeESClient({
      request,
      savedObjectsClient,
      isInspectorEnabled,
      esClient: esClient.asCurrentUser,
    });

    server.uptimeEsClient = uptimeEsClient;

    if (
      (isInspectorEnabled || server.isDev) &&
      server.config.service?.username !== 'localKibanaIntegrationTestsUser'
    ) {
      inspectableEsQueriesMap.set(request, []);
    }

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
        ...((isInspectorEnabled || server.isDev) && uptimeRoute.path !== API_URLS.DYNAMIC_SETTINGS
          ? { _inspect: inspectableEsQueriesMap.get(request) }
          : {}),
      },
    });
  },
});
