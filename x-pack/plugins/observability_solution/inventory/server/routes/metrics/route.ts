/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServerSentEventBase } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import { map, tap, type Observable } from 'rxjs';
import { notFound } from '@hapi/boom';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import {
  ExtractMetricDefinitionProcess,
  extractMetricDefinitions,
} from '../../lib/datasets/extract_metric_definitions';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { lookupEntitiesById } from '../entities/lookup_entities_by_id';
import { esqlResponseToEntities } from '../../../common/utils/esql_response_to_entities';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { fetchEntityDefinitions } from '../entities/route';

const suggestMetricsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/metrics/suggest',
  params: z.object({
    body: z.object({
      connectorId: z.string(),
      entity: z.object({
        type: z.string(),
        displayName: z.string(),
      }),
      start: z.number(),
      end: z.number(),
      indexPatterns: z.array(z.string()),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    params,
    context,
    logger,
    plugins,
    request,
  }): Promise<
    Observable<
      ServerSentEventBase<'extract_metric_definitions', { process: ExtractMetricDefinitionProcess }>
    >
  > => {
    const {
      body: { indexPatterns, connectorId, entity, start, end },
    } = params;

    const inferenceClient = (await plugins.inference.start()).getClient({ request });

    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const [entityFromIndex, typeDefinition] = await Promise.all([
      lookupEntitiesById({
        esClient,
        start,
        end,
        entities: [
          {
            type: entity.type,
            displayName: entity.displayName,
          },
        ],
      }).then((response) => esqlResponseToEntities(response)[0]),
      fetchEntityDefinitions({
        plugins,
        request,
      }).then(({ definitions }) =>
        definitions.find((definition) => definition.type === entity.type)
      ),
    ]);

    if (!entityFromIndex || !typeDefinition) {
      throw notFound();
    }

    return extractMetricDefinitions({
      indexPatterns,
      connectorId,
      esClient: (await context.core).elasticsearch.client,
      inferenceClient,
      logger,
      entity,
      dslFilter: getEntitySourceDslFilter({
        entity: entityFromIndex,
        identityFields: typeDefinition?.identityFields,
      }),
    }).pipe(
      tap({
        error: (error) => {
          logger.error(error);
        },
      }),
      map((process) => {
        return {
          type: 'extract_metric_definitions',
          process,
        };
      })
    );
  },
});

export const metricsRoutes = {
  ...suggestMetricsRoute,
};
