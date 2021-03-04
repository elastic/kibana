/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMKibanaRouteWrapper } from './types';
import { createUptimeESClient } from '../lib/lib';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaResponse } from '../../../../../src/core/server/http/router';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = (uptimeRoute) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
  },
  handler: async (context, request, response) => {
    const { client: esClient } = context.core.elasticsearch;
    const { client: savedObjectsClient } = context.core.savedObjects;

    const uptimeEsClient = createUptimeESClient({
      request,
      savedObjectsClient,
      esClient: esClient.asCurrentUser,
    });

    const res = await uptimeRoute.handler({
      uptimeEsClient,
      savedObjectsClient,
      context,
      request,
      response,
    });

    if (res instanceof KibanaResponse) {
      return res;
    }

    return response.ok({
      body: {
        ...res,
      },
    });
  },
});
