/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getLatestEntities } from './get_latest_entities';

export const listLatestEntitiesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ context, logger }) => {
    const coreContext = await context.core;
    const inventoryEsClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: '@kbn/inventory-plugin',
    });

    const latestEntities = await getLatestEntities({ inventoryEsClient });

    return { entities: latestEntities };
  },
});

export const entitiesRoutes = {
  ...listLatestEntitiesRoute,
};
