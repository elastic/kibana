/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import { joinByKey } from '@kbn/observability-utils-common/array/join_by_key';
import * as t from 'io-ts';
import { orderBy } from 'lodash';
import moment from 'moment';
import { DATA_STREAM_TYPE } from '@kbn/dataset-quality-plugin/common/es_fields';
import { InventoryEntity, entityColumnIdsRt } from '../../../common/entities';
import { createAlertsClient } from '../../lib/create_alerts_client/create_alerts_client';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getIdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';
import { getLatestEntitiesAlerts } from './get_latest_entities_alerts';

export const getEntityTypesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/types',
  params: t.partial({
    query: t.partial({
      includeEntityTypes: jsonRt.pipe(t.array(t.string)),
      excludeEntityTypes: jsonRt.pipe(t.array(t.string)),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request, params }) => {
    const entityManagerStart = await plugins.entityManager.start();

    const entityManagerClient = await entityManagerStart.getScopedClient({ request });

    const rawEntityTypes = await entityManagerClient.v2.readTypeDefinitions();
    const { includeEntityTypes, excludeEntityTypes } = params?.query ?? {};

    if (includeEntityTypes?.length) {
      const entityTypes = rawEntityTypes
        .filter((entityType) => includeEntityTypes.includes(entityType.id))
        .map((entityType) => entityType.id);

      return { entityTypes };
    }

    const entityTypes = rawEntityTypes
      .filter((entityType) => !excludeEntityTypes?.includes(entityType.id))
      .map((entityType) => entityType.id);

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
        entityType: t.string,
      }),
      t.partial({
        kuery: t.string,
      }),
    ]),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ params, plugins, request }): Promise<{ entities: InventoryEntity[] }> => {
    const entityManagerStart = await plugins.entityManager.start();

    const { sortDirection, sortField, entityType } = params.query;

    const entityManagerClient = await entityManagerStart.getScopedClient({ request });
    const [alertsClient, entities] = await Promise.all([
      createAlertsClient({ plugins, request }),
      entityManagerClient.v2.searchEntities({
        start: moment().subtract(15, 'm').toISOString(),
        end: moment().toISOString(),
        limit: 500,
        type: entityType,
        metadata_fields: [DATA_STREAM_TYPE],
        filters: [],
      }),
    ]);

    const identityFieldsPerEntityType = getIdentityFieldsPerEntityType(entities);

    const alerts = await getLatestEntitiesAlerts({
      identityFieldsPerEntityType,
      alertsClient,
    });

    const joined = joinByKey(
      [...entities, ...alerts] as InventoryEntity[],
      [...identityFieldsPerEntityType.values()].flat()
    ).filter((latestEntity) => latestEntity.entityId);

    return {
      entities:
        sortField === 'alertsCount'
          ? orderBy(
              joined,
              [(item: InventoryEntity) => item?.alertsCount === undefined, sortField],
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
