/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import { map, tap, type Observable } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
import type { DatasetEntity } from '../../../common/datasets';
import { MetricDefinition } from '../../../common/metrics';
import {
  ExtractMetricDefinitionProcess,
  extractMetricDefinitions,
} from '../../lib/datasets/extract_metric_definitions';
import { getDatasets } from '../../lib/datasets/get_datasets';
import { createInventoryServerRoute } from '../create_inventory_server_route';

const listDatasetsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/datasets',
  params: z
    .object({
      query: z
        .object({
          indexPatterns: z.string(),
        })
        .partial(),
    })
    .partial(),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ params, context, logger }): Promise<{ datasets: DatasetEntity[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const allDatasets = await getDatasets({
      esClient,
      indexPatterns: params?.query?.indexPatterns?.split(','),
    });

    return {
      datasets: allDatasets.map((dataset) => dataset.entity),
    };
  },
});

const listDatasetMetricsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/datasets/{name}/metrics/definitions',
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ params, context, logger }): Promise<{ metrics: MetricDefinition[] }> => {
    return {
      metrics: [],
    };
  },
});

const extractDatasetMetricsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/datasets/{name}/metrics/extract',
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      connectorId: z.string(),
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
      path: { name },
      body: { connectorId },
    } = params;

    const inferenceClient = (await plugins.inference.start()).getClient({ request });

    return extractMetricDefinitions({
      indexPatterns: [name],
      connectorId,
      esClient: (await context.core).elasticsearch.client,
      inferenceClient,
      logger,
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

export const datasetsRoutes = {
  ...listDatasetsRoute,
  ...listDatasetMetricsRoute,
  ...extractDatasetMetricsRoute,
};
