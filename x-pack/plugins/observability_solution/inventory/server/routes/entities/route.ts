/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { createEntitiesESClient } from '../../lib/create_es_client/create_entities_es_client';
import { getLatestEntities } from './get_latest_entities';

export const listLatestEntitiesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request, context }) => {
    const coreContext = await context.core;
    const entitiesESClient = createEntitiesESClient({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      request,
    });

    const latestEntities = await getLatestEntities({ entitiesESClient });

    return { entities: latestEntities };
  },
});

export const entitiesRoutes = {
  ...listLatestEntitiesRoute,
};
