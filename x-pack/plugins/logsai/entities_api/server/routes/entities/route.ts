/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { EntityWithSignalStatus } from '../../../common';
import { createEntitiesAPIServerRoute } from '../create_entities_api_server_route';
import { getEntities } from './get_entities';
import { createEntitiesAPIEsClient } from '../../lib/clients/create_entities_api_es_client';
import { createSloClient } from '../../lib/clients/create_slo_client';
import { createAlertsClient } from '../../lib/clients/create_alerts_client';
import { getDefinitionEntities } from '../../lib/get_definition_entities';

export const getEntitiesRoute = createEntitiesAPIServerRoute({
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

    const definitionEntities = await getDefinitionEntities({
      esClient: currentUserEsClient,
    });

    const groupings = definitionEntities
      .filter((definitionEntity) => {
        return types.includes('all') || types.includes(definitionEntity.type);
      })
      .map((definitionEntity) => {
        return {
          id: definitionEntity.id,
          pivot: {
            identityFields: definitionEntity.pivot.identityFields,
            type: definitionEntity.type,
          },
          filters: definitionEntity.filters,
        };
      });

    const entities = await getEntities({
      start,
      end,
      alertsClient,
      currentUserEsClient,
      groupings,
      internalUserEsClient,
      logger,
      sloClient,
      sortField,
      sortOrder,
      sources: [{ index: ['logs*', 'traces*', 'metrics*'] }],
      spaceId,
      filters,
      postFilter: undefined,
    });

    return {
      entities,
    };
  },
});

export const entitiesRoutes = {
  ...getEntitiesRoute,
};
