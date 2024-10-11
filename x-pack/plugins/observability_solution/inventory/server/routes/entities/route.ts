/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { jsonRt } from '@kbn/io-ts-utils';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { orderBy } from 'lodash';
import { joinByKey } from '@kbn/observability-utils/array/join_by_key';
import { entityTypeRt, entityColumnIdsRt, Entity } from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getEntityTypes } from './get_entity_types';
import { getLatestEntities } from './get_latest_entities';
import { createAlertsClient } from '../../lib/create_alerts_client.ts/create_alerts_client';
import { getLatestEntitiesAlerts } from './get_latest_entities_alerts';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

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
        sortField: entityColumnIdsRt,
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
  handler: async ({ params, context, logger, plugins, request }) => {
    const coreContext = await context.core;
    const inventoryEsClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: `@kbn/${INVENTORY_APP_ID}-plugin`,
    });

    const { sortDirection, sortField, entityTypes, kuery } = params.query;

    const [alertsClient, latestEntities] = await Promise.all([
      createAlertsClient({ plugins, request }),
      getLatestEntities({
        inventoryEsClient,
        sortDirection,
        sortField,
        entityTypes,
        kuery,
      }),
    ]);

    const identityFieldsPerEntityType = getIdentityFieldsPerEntityType(latestEntities);

    const alerts = await getLatestEntitiesAlerts({
      identityFieldsPerEntityType,
      alertsClient,
      kuery,
    });

    const joined = joinByKey(
      [...latestEntities, ...alerts],
      [...identityFieldsPerEntityType.values()].flat()
    ).filter((entity) => entity['entity.id']);

    return {
      entities:
        sortField === 'alertsCount'
          ? orderBy(
              joined,
              [(item: Entity) => item?.alertsCount === undefined, sortField],
              ['asc', sortDirection] // push entities without alertsCount to the end
            )
          : joined,
    };
  },
});

export const entitiesRoutes = {
  ...listLatestEntitiesRoute,
  ...getEntityTypesRoute,
};
