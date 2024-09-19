/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServerSentEventBase } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import { map, tap, type Observable } from 'rxjs';
import {
  ExtractMetricDefinitionProcess,
  extractMetricDefinitions,
} from '../../lib/datasets/extract_metric_definitions';
import { createInventoryServerRoute } from '../create_inventory_server_route';

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
  ...extractDatasetMetricsRoute,
};
