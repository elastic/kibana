/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaRouteWrapper } from './types';
import { savedObjectsAdapter } from '../lib/saved_objects';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = (uptimeRoute) => ({
  ...uptimeRoute,
  options: {
    tags: ['access:uptime-read', ...(uptimeRoute?.writeAccess ? ['access:uptime-write'] : [])],
  },
  handler: async (context, request, response) => {
    const { callAsCurrentUser: callES } = context.core.elasticsearch.legacy.client;
    const { client: savedObjectsClient } = context.core.savedObjects;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);
    return uptimeRoute.handler(
      { callES, savedObjectsClient, dynamicSettings },
      context,
      request,
      response
    );
  },
});
