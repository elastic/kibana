/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { notFound } from '@hapi/boom';
import type {
  Entity,
  InventoryEntityDefinition,
  VirtualEntityDefinition,
} from '../../../common/entities';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getDataStreamsForFilter } from './get_data_streams_for_filter';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { toEntity } from '../../../common/utils/to_entity';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';

const listInventoryDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/definition/inventory',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request }): Promise<{ definitions: InventoryEntityDefinition[] }> => {
    async function fetchEntityDefinitions() {
      const entityManagerStart = await plugins.entityManager.start();
      const client = await entityManagerStart.getScopedClient({ request });

      return await client.getEntityDefinitions({
        page: 1,
        perPage: 10000,
      });
    }

    const { definitions } = await fetchEntityDefinitions();

    return {
      definitions: definitions.map((definition): InventoryEntityDefinition => {
        return {
          id: definition.id,
          type: definition.type,
          identityFields: definition.identityFields,
          definitionType: 'inventory',
          displayNameTemplate: definition.displayNameTemplate,
          label: definition.name,
          managed: definition.managed,
          metadata:
            definition.metadata?.map(({ source, destination }) => {
              return {
                source,
                destination,
              };
            }) ?? [],
          sources: [
            {
              indexPatterns: definition.indexPatterns,
            },
          ],
          extractionDefinitions: [
            {
              source: {
                indexPatterns: definition.indexPatterns,
              },
              metadata: definition.metadata ?? [],
            },
          ],
        };
      }),
    };
  },
});

const listInventoryEntitiesRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/inventory',
  params: t.type({
    body: t.type({
      kuery: t.string,
      start: t.number,
      end: t.number,
      type: t.union([t.literal('all'), t.string]),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async (): Promise<{ entities: Entity[]; total: number }> => {
    return {
      entities: [],
      total: 0,
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

    const response = await esClient.esql('get_entity', {
      query: `FROM entities-*-latest | WHERE entity.type == "${type}" AND entity.displayName.keyword == "${displayName}" | LIMIT 1`,
    });

    if (response.values.length === 0) {
      throw notFound();
    }

    const result = esqlResultToPlainObjects(response)[0];

    return {
      entity: toEntity(result),
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
};
