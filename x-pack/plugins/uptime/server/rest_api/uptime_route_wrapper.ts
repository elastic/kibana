/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaRouteWrapper } from './types';
import { createUptimeESClient } from '../lib/lib';
import { savedObjectsAdapter } from '../lib/saved_objects';

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

    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);

    const uptimeESClient = createUptimeESClient({
      dynamicSettings,
      request,
      esClient: esClient.asCurrentUser,
    });

    try {
      const res = await uptimeRoute.handler({
        uptimeESClient,
        savedObjectsClient,
        context,
        request,
        response,
        dynamicSettings,
      });

      if (res instanceof KibanaResponse) {
        return res;
      }

      return response.ok({
        body: {
          ...res,
        },
      });
    } catch (e) {
      // please don't remove this, this will be really helpful during debugging
      /* eslint-disable-next-line no-console */
      console.error(e);

      return response.internalError({
        body: {
          message: e.message,
        },
      });
    }
  },
});
