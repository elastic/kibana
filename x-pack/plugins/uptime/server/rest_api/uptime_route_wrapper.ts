/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { UMKibanaRouteWrapper } from './types';
import { createUptimeESClient, inspectableEsQueriesMap } from '../lib/lib';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaResponse } from '../../../../../src/core/server/http/router';
import { enableInspectEsQueries } from '../../../observability/common';
import { syntheticsServiceApiKey } from '../lib/saved_objects/service_api_key';
import { API_URLS } from '../../common/constants';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = (uptimeRoute, server) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
  },
  handler: async (context, request, response) => {
    const { client: esClient } = context.core.elasticsearch;
    let savedObjectsClient: SavedObjectsClientContract;
    if (server.config?.service) {
      savedObjectsClient = context.core.savedObjects.getClient({
        includedHiddenTypes: [syntheticsServiceApiKey.name],
      });
    } else {
      savedObjectsClient = context.core.savedObjects.client;
    }

    // specifically needed for the synthetics service api key generation
    server.authSavedObjectsClient = savedObjectsClient;

    const isInspectorEnabled = await context.core.uiSettings.client.get<boolean>(
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
