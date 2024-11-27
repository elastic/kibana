/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getHasData } from './get_has_data';

export const hasDataRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/has_data',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ context, logger }) => {
    const coreContext = await context.core;
    const inventoryEsClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: `@kbn/${INVENTORY_APP_ID}-plugin`,
    });

    return getHasData({
      inventoryEsClient,
      logger,
    });
  },
});

export const hasDataRoutes = {
  ...hasDataRoute,
};
