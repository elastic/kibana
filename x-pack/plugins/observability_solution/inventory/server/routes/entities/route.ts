/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notFound } from '@hapi/boom';
import { SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { partition } from 'lodash';
import type {
  Entity,
  EntityWithSignals,
  InventoryEntityDefinition,
  VirtualEntityDefinition,
} from '../../../common/entities';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { InventoryRouteHandlerResources } from '../types';
import {
  DashboardWithEntityDataCheck,
  checkDashboardsForEntityData,
} from './check_dashboards_for_entity_data';
import { eemToInventoryDefinition } from './eem_to_inventory_definition';
import { getDataStreamsForFilter } from './get_data_streams_for_filter';
import { getEntitiesFromSource } from './get_entities_from_source';
import { getEntityById } from './get_entity_by_id';
import { getLatestEntities } from './get_latest_entities';

export async function fetchEntityDefinitions({
  request,
  plugins: { entityManager },
}: {
  request: InventoryRouteHandlerResources['request'];
  plugins: {
    entityManager: InventoryRouteHandlerResources['plugins']['entityManager'];
  };
}) {
  const entityManagerStart = await entityManager.start();
  const client = await entityManagerStart.getScopedClient({ request });

  return await client.getEntityDefinitions({
    page: 1,
    perPage: 10000,
  });
}

const listInventoryDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/definition/inventory',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request }): Promise<{ definitions: InventoryEntityDefinition[] }> => {
    const { definitions } = await fetchEntityDefinitions({ plugins, request });

    return {
      definitions: definitions.map(eemToInventoryDefinition),
    };
  },
});

const listInventoryEntitiesRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/inventory',
  params: t.type({
    body: t.intersection([
      t.type({
        kuery: t.string,
        start: t.number,
        end: t.number,
        type: t.union([t.literal('all'), t.string]),
      }),
      t.partial({
        fromSourceIfEmpty: t.boolean,
        dslFilter: t.array(t.record(t.string, t.any)),
      }),
    ]),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    context,
    logger,
    params,
    plugins,
    request,
  }): Promise<{ entities: EntityWithSignals[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { start, end, kuery, type, fromSourceIfEmpty, dslFilter },
    } = params;

    const [rulesClient, alertsClient, { definitions }] = await Promise.all([
      plugins.alerting
        .start()
        .then((alertingStart) => alertingStart.getRulesClientWithRequest(request)),
      plugins.ruleRegistry
        .start()
        .then((ruleRegistryStart) => ruleRegistryStart.getRacClientWithRequest(request)),
      fetchEntityDefinitions({ plugins, request }),
    ]);

    return {
      entities: await getLatestEntities({
        esClient,
        start,
        end,
        kuery,
        fromSourceIfEmpty,
        typeDefinitions: (type === 'all'
          ? definitions
          : definitions.filter((definition) => definition.type === type)
        ).map(eemToInventoryDefinition),
        logger,
        dslFilter,
        rulesClient,
        alertsClient,
      }),
    };
  },
});

const listRelationshipsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entity/relationships',
  params: t.type({
    body: t.type({
      displayName: t.string,
      type: t.string,
      start: t.number,
      end: t.number,
      indexPatterns: t.array(t.string),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    context,
    logger,
    params,
    plugins,
    request,
  }): Promise<{ relatedEntities: Array<Pick<Entity, 'displayName' | 'type'>> }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { start, end, displayName, type, indexPatterns },
    } = params;

    const [{ definitions }, entity] = await Promise.all([
      fetchEntityDefinitions({ plugins, request }),
      getEntityById({
        esClient,
        displayName,
        type,
      }),
    ]);

    if (!entity) {
      throw notFound();
    }

    const allDefinitions = definitions.map(eemToInventoryDefinition);

    const [[ownDefinition], allOtherDefinitions] = partition(
      allDefinitions,
      (definition) => definition.type === type
    );
    const entitySourceDslFilter = getEntitySourceDslFilter({
      entity,
      identityFields: ownDefinition.identityFields,
    });

    const relatedEntitiesFromSource = await Promise.all(
      allOtherDefinitions.map((definition) =>
        getEntitiesFromSource({
          esClient,
          start,
          end,
          definition,
          indexPatterns,
          logger,
          kuery: '',
          dslFilter: entitySourceDslFilter,
        })
      )
    );

    return {
      relatedEntities: relatedEntitiesFromSource.flat(),
    };
  },
});

const listVirtualEntityDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/definition/virtual',
  params: t.type({
    body: t.type({
      parentTypeId: t.string,
      kuery: t.string,
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async (): Promise<{ definitions: VirtualEntityDefinition[] }> => {
    return {
      definitions: [],
    };
  },
});

const listDataStreamsForEntityRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/data_streams/find_datastreams_for_filter',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      kql: t.string,
      indexPatterns: t.array(t.string),
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({
    params,
    context,
    logger,
  }): Promise<{ dataStreams: Array<{ name: string }> }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const { start, end, kql, indexPatterns } = params.body;

    return {
      dataStreams: await getDataStreamsForFilter({
        kql,
        indexPatterns,
        start,
        end,
        esClient,
      }),
    };
  },
});

const getEntityRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity/{type}/{displayName}',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    path: t.type({
      type: t.string,
      displayName: t.string,
    }),
  }),
  handler: async ({ params, context, logger }): Promise<{ entity: Entity }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      path: { type, displayName },
    } = params;

    return {
      entity: await getEntityById({
        displayName,
        type,
        esClient,
      }),
    };
  },
});

const checkDashboardsForDataRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/check_dashboards_for_data',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      dashboardIds: t.array(t.string),
      entity: t.type({
        displayName: t.string,
        type: t.string,
      }),
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({
    request,
    plugins,
    logger,
    context,
    params,
  }): Promise<{
    dashboards: DashboardWithEntityDataCheck[];
  }> => {
    const {
      body: {
        dashboardIds,
        entity: { type, displayName },
        start,
        end,
      },
    } = params;

    const coreContext = await context.core;

    const esClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const [dashboardsSoBulkResponse, definition, entity] = await Promise.all([
      coreContext.savedObjects.client.bulkGet(
        dashboardIds.map((dashboardId) => ({ id: dashboardId, type: 'dashboard' }))
      ),
      fetchEntityDefinitions({
        plugins,
        request,
      }).then(({ definitions }) => {
        return definitions.find((def) => def.type === type);
      }),
      getEntityById({
        esClient,
        type,
        displayName,
      }),
    ]);

    if (!definition) {
      throw notFound();
    }
    return {
      dashboards: await checkDashboardsForEntityData({
        dashboards: dashboardsSoBulkResponse.saved_objects as Array<
          SavedObject<DashboardAttributes>
        >,
        entity,
        esClient,
        identityFields: definition.identityFields,
        logger,
        start,
        end,
      }),
    };
  },
});

const listEntitiesRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      kuery: t.string,
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({ params, context, logger }): Promise<{ entities: Entity[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { kuery, start, end },
    } = params;

    const response = await esClient.esql('get_entity', {
      ...getEsqlRequest({
        query: `FROM entities-*-latest`,
        kuery,
        start,
        end,
      }),
    });

    if (response.values.length === 0) {
      throw notFound();
    }

    return {
      entities: esqlResultToPlainObjects(response),
    };
  },
});

export const entitiesRoutes = {
  ...listInventoryDefinitionsRoute,
  ...listVirtualEntityDefinitionsRoute,
  ...listInventoryEntitiesRoute,
  ...listDataStreamsForEntityRoute,
  ...getEntityRoute,
  ...listEntitiesRoute,
  ...listRelationshipsRoute,
  ...checkDashboardsForDataRoute,
};
