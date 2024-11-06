/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import {
  Entity,
  entitySourceQuery,
  EntityWithSignalStatus,
  getIndexPatternsForFilters,
} from '../../../common';
import { EntityTypeDefinition } from '../../../common/entities';
import { entityTimeRangeQuery } from '../../../common/queries/entity_time_range_query';
import { createAlertsClient } from '../../lib/clients/create_alerts_client';
import { createEntitiesAPIEsClient } from '../../lib/clients/create_entities_api_es_client';
import { createSloClient } from '../../lib/clients/create_slo_client';
import { getDataStreamsForFilter } from '../../lib/entities/get_data_streams_for_filter';
import { getDefinitionEntities } from '../../lib/entities/get_definition_entities';
import { getTypeDefinitions } from '../../lib/entities/get_type_definitions';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';
import { getEntities } from './get_entities';
import { getEntityFromTypeAndKey } from './get_entity_from_type_and_key';

export const findEntitiesRoute = createEntitiesAPIServerRoute({
  endpoint: 'POST /internal/entities_api/entities',
  options: {
    tags: ['access:entities'],
  },
  params: z.object({
    body: z.object({
      start: z.number(),
      end: z.number(),
      kuery: z.string(),
      types: z.array(z.string()),
      sortField: z.union([
        z.literal('entity.type'),
        z.literal('entity.displayName'),
        z.literal('alertsCount'),
        z.literal('healthStatus'),
      ]),
      sortOrder: z.union([z.literal('asc'), z.literal('desc')]),
    }),
  }),
  handler: async (resources): Promise<{ entities: EntityWithSignalStatus[] }> => {
    const { context, logger, request } = resources;

    const {
      body: { start, end, kuery, types, sortField, sortOrder },
    } = resources.params;

    const [currentUserEsClient, internalUserEsClient, sloClient, alertsClient, spaceId] =
      await Promise.all([
        createEntitiesAPIEsClient(resources),
        createObservabilityEsClient({
          client: (await context.core).elasticsearch.client.asInternalUser,
          logger,
          plugin: 'entitiesApi',
        }),
        createSloClient(resources),
        createAlertsClient(resources),
        (await resources.plugins.spaces.start()).spacesService.getSpaceId(request),
      ]);

    const filters = [...kqlQuery(kuery)];

    const [definitionEntities, typeDefinitions] = await Promise.all([
      getDefinitionEntities({
        esClient: currentUserEsClient,
      }),
      getTypeDefinitions({
        esClient: currentUserEsClient,
      }),
    ]);

    const groupings = definitionEntities
      .filter((definitionEntity) => {
        return types.includes('all') || types.includes(definitionEntity.type);
      })
      .map((definitionEntity) => {
        return {
          id: definitionEntity.id,
          type: definitionEntity.type,
          key: definitionEntity.key,
          pivot: {
            type: definitionEntity.type,
            identityFields: definitionEntity.pivot.identityFields,
          },
          displayName: definitionEntity.displayName,
          filters: definitionEntity.filters,
        };
      });

    const entities = await getEntities({
      start,
      end,
      alertsClient,
      currentUserEsClient,
      typeDefinitions,
      groupings,
      internalUserEsClient,
      logger,
      sloClient,
      sortField,
      sortOrder,
      sources: [{ index: ['.data_streams'] }],
      sourceRangeQuery: {
        bool: {
          should: [
            { bool: { filter: entityTimeRangeQuery(start, end) } },
            { bool: { filter: rangeQuery(start, end) } },
            {
              bool: {
                must_not: [
                  {
                    exists: {
                      field: 'entity.firstSeenTimestamp',
                    },
                  },
                  {
                    exists: {
                      field: '@timestamp',
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      spaceId,
      filters,
      postFilter: undefined,
    });

    return {
      entities,
    };
  },
});

export const getEntityRoute = createEntitiesAPIServerRoute({
  endpoint: 'GET /internal/entities_api/entity/{type}/{key}',
  options: {
    tags: ['access:entities'],
  },
  params: z.object({
    path: z.object({
      type: z.string(),
      key: z.string(),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    entity: Entity;
    typeDefinition: EntityTypeDefinition;
  }> => {
    const {
      path: { type, key },
    } = resources.params;

    const esClient = await createEntitiesAPIEsClient(resources);

    const [definitionEntities, typeDefinitions] = await Promise.all([
      getDefinitionEntities({
        esClient,
      }),
      getTypeDefinitions({
        esClient,
      }),
    ]);

    return await getEntityFromTypeAndKey({
      esClient,
      type,
      key,
      typeDefinitions,
      definitionEntities,
    });
  },
});

export const getDataStreamsForEntityRoute = createEntitiesAPIServerRoute({
  endpoint: 'GET /internal/entities_api/entity/{type}/{key}/data_streams',
  options: {
    tags: ['access:entities'],
  },
  params: z.object({
    path: z.object({
      type: z.string(),
      key: z.string(),
    }),
    query: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  handler: async (resources): Promise<{ dataStreams: Array<{ name: string }> }> => {
    const {
      path: { type, key },
      query: { start: startAsString, end: endAsString },
    } = resources.params;

    const start = Number(startAsString);
    const end = Number(endAsString);

    const esClient = await createEntitiesAPIEsClient(resources);

    const [definitionEntities, typeDefinitions] = await Promise.all([
      getDefinitionEntities({
        esClient,
      }),
      getTypeDefinitions({
        esClient,
      }),
    ]);

    const { entity } = await getEntityFromTypeAndKey({
      esClient,
      type,
      key,
      definitionEntities,
      typeDefinitions,
    });

    const foundDataStreams = await getDataStreamsForFilter({
      start,
      end,
      esClient,
      dslFilter: entitySourceQuery({ entity }),
      indexPatterns: definitionEntities.flatMap((definition) =>
        getIndexPatternsForFilters(definition.filters)
      ),
    });

    return {
      dataStreams: foundDataStreams,
    };
  },
});

export const entitiesRoutes = {
  ...findEntitiesRoute,
  ...getEntityRoute,
  ...getDataStreamsForEntityRoute,
};
