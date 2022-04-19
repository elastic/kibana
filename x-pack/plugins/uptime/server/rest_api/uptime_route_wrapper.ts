/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaResponse } from '@kbn/core/server/http/router';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { UMKibanaRouteWrapper } from './types';
import { createUptimeESClient, inspectableEsQueriesMap } from '../lib/lib';

import { syntheticsServiceApiKey } from '../lib/saved_objects/service_api_key';
import { API_URLS } from '../../common/constants';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = (uptimeRoute, server) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
  },
  handler: async (context, request, response) => {
    const coreContext = await context.core;
    const { client: esClient } = coreContext.elasticsearch;
    let savedObjectsClient: SavedObjectsClientContract;
    if (server.config?.service) {
      savedObjectsClient = coreContext.savedObjects.getClient({
        includedHiddenTypes: [syntheticsServiceApiKey.name],
      });
    } else {
      savedObjectsClient = coreContext.savedObjects.client;
    }

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

    if (isInspectorEnabled || server.isDev) {
      inspectableEsQueriesMap.set(request, []);
    }

    const res = await uptimeRoute.handler({
      uptimeEsClient,
      savedObjectsClient,
      context,
      request,
      response,
      server,
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
