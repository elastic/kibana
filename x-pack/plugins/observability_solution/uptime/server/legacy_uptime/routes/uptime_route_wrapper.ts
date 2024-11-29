/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isKibanaResponse } from '@kbn/core-http-server';
import type { UMKibanaRouteWrapper } from './types';
import { UptimeEsClient } from '../lib/lib';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = (uptimeRoute, server) => ({
  ...uptimeRoute,
  options: {
    tags: ['oas-tag:uptime'],
  },
  security: {
    authz: {
      requiredPrivileges: ['uptime-read', ...(uptimeRoute?.writeAccess ? ['uptime-write'] : [])],
    },
  },
  handler: async (context, request, response) => {
    const coreContext = await context.core;
    const { client: esClient } = coreContext.elasticsearch;

    const uptimeEsClient = new UptimeEsClient(
      coreContext.savedObjects.client,
      esClient.asCurrentUser,
      {
        request,
        uiSettings: coreContext.uiSettings,
        isDev: Boolean(server.isDev),
      }
    );

    const res = await uptimeRoute.handler({
      uptimeEsClient,
      savedObjectsClient: coreContext.savedObjects.client,
      context,
      request,
      response,
      server,
    });

    if (isKibanaResponse(res)) {
      return res;
    }

    return response.ok({
      body: {
        ...res,
        ...(await uptimeEsClient.getInspectData(uptimeRoute.path)),
      },
    });
  },
});
