/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMKibanaRouteWrapper } from './types';

export const uptimeRouteWrapper: UMKibanaRouteWrapper = uptimeRoute => {
  return {
    ...uptimeRoute,
    handler: async (context, request, response) => {
      const { callAsCurrentUser: callES } = context.core.elasticsearch.dataClient;
      const { client: savedObjectsClient } = context.core.savedObjects;
      return await uptimeRoute.handler({ callES, savedObjectsClient }, context, request, response);
    },
  };
};
