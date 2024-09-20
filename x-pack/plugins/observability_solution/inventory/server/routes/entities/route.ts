/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { entityTypeRt } from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getLatestEntities } from './get_latest_entities';
import { getEntityTypes } from './get_entity_types';

export const getEntityTypesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/types',
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

    const entityTypes = await getEntityTypes({ inventoryEsClient });
    return { entityTypes };
  },
});

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
        kuery: t.string,
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
      plugin: `@kbn/${INVENTORY_APP_ID}-plugin`,
    });

    const { sortDirection, sortField, entityTypes, kuery } = params.query;

    const latestEntities = await getLatestEntities({
      inventoryEsClient,
      sortDirection,
      sortField,
      entityTypes,
      kuery,
    });

    return { entities: latestEntities };
  },
});

export const entitiesRoutes = {
  ...listLatestEntitiesRoute,
  ...getEntityTypesRoute,
};
