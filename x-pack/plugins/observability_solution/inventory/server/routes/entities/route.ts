/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { orderBy } from 'lodash';
import moment from 'moment';
import { DATA_STREAM_TYPE } from '@kbn/dataset-quality-plugin/common/es_fields';
import { joinByKey } from '@kbn/observability-utils-common/array/join_by_key';
import { InventoryEntity, entityColumnIdsRt } from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { createAlertsClient } from '../../lib/create_alerts_client/create_alerts_client';
import { getLatestEntitiesAlerts } from './get_latest_entities_alerts';

export const getEntityTypesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/types',
  params: t.partial({
    query: t.partial({
      includeEntityTypes: jsonRt.pipe(t.array(t.string)),
      excludeEntityTypes: jsonRt.pipe(t.array(t.string)),
      kuery: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['inventory'],
    },
  },
  handler: async ({ plugins, request, params }) => {
    const entityManagerStart = await plugins.entityManager.start();

    const entityManagerClient = await entityManagerStart.getScopedClient({ request });
    const { includeEntityTypes, excludeEntityTypes, kuery } = params?.query ?? {};

    const rawEntityTypes = await entityManagerClient.v2.readTypeDefinitions();
    const entityTypes = includeEntityTypes?.length
      ? rawEntityTypes.filter((entityType) => includeEntityTypes.includes(entityType.id))
      : rawEntityTypes.filter((entityType) => !excludeEntityTypes?.includes(entityType.id));

    const entityCount = await entityManagerClient.v2.countEntities({
      start: moment().subtract(15, 'm').toISOString(),
      end: moment().toISOString(),
      types: entityTypes.map((entityType) => entityType.id),
      filters: kuery ? [kuery] : undefined,
    });

    const entityTypesWithCount = entityTypes
      .map((entityType) => ({
        ...entityType,
        count: entityCount.types[entityType.id],
      }))
      .filter((entityType) => entityType.count > 0);

    return { entityTypes: entityTypesWithCount, totalEntities: entityCount.total };
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
  security: {
    authz: {
      requiredPrivileges: ['inventory'],
    },
  },
  handler: async ({
    params,
    plugins,
    request,
    logger,
    context,
  }): Promise<{ entities: Array<Partial<InventoryEntity>> }> => {
    const entityManagerStart = await plugins.entityManager.start();
    const { client: clusterClient } = (await context.core).elasticsearch;

    const { sortDirection, sortField, kuery, entityType } = params.query;

    const [entityManagerClient, alertsClient] = await Promise.all([
      entityManagerStart.getScopedClient({ request }),
      createAlertsClient({ plugins, request }),
    ]);
    const [{ entities: rawEntities }, identityFieldsBySource] = await Promise.all([
      entityManagerClient.v2.searchEntities({
        start: moment().subtract(15, 'm').toISOString(),
        end: moment().toISOString(),
        limit: 500,
        type: entityType,
        metadata_fields: [DATA_STREAM_TYPE],
        filters: kuery ? [kuery] : [],
      }),
      entityManagerStart.v2.getIdentityFields(entityType, clusterClient, logger),
    ]);

    const alerts = await getLatestEntitiesAlerts({
      identityFieldsBySource,
      alertsClient,
    });

    const entities: InventoryEntity[] = rawEntities.map((entity) => {
      return {
        entityId: entity['entity.id'],
        entityType: entity['entity.type'],
        entityDisplayName: entity['entity.display_name'],
        entityLastSeenTimestamp: entity['entity.last_seen_timestamp'] as string,
        entityIdentityFields: identityFieldsBySource,
        ...entity,
      };
    });

    const joined = joinByKey(
      [...entities, ...alerts] as InventoryEntity[],
      [...Object.values(identityFieldsBySource)].flat()
    ).filter((latestEntity: InventoryEntity) => latestEntity.entityId);

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
