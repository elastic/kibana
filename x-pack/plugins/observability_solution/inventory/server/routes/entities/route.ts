/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { entityTypeRt } from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getLatestEntities } from './get_latest_entities';

export const listLatestEntitiesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities',
  params: t.type({
    query: t.intersection([
      t.type({
        sortField: t.string,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
      }),
      t.partial({
        entityTypes: jsonRt.pipe(t.array(entityTypeRt)),
      }),
    ]),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ params, context, logger }) => {
    const coreContext = await context.core;
    const inventoryEsClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: '@kbn/inventory-plugin',
    });

    const { sortDirection, sortField, entityTypes } = params.query;

    const latestEntities = await getLatestEntities({
      inventoryEsClient,
      sortDirection,
      sortField,
      entityTypes,
    });

    return { entities: latestEntities };
  },
});

export const entitiesRoutes = {
  ...listLatestEntitiesRoute,
};
