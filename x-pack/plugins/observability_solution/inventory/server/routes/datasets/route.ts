/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import { keyBy } from 'lodash';
import { map, tap, type Observable } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
import type { Dataset } from '../../../common/datasets';
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
  handler: async ({ params, context, logger }): Promise<{ datasets: Dataset[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const allDatasets = await getDatasets({
      esClient,
      indexPatterns: params?.query?.indexPatterns?.split(','),
    });

    const datasetsByName = keyBy(allDatasets, (dataset) => dataset.name);

    const allNames = Object.keys(datasetsByName);

    const datasetsByIndexName: Record<string, string[]> = {};

    allDatasets.forEach((dataset) => {
      dataset.indices.forEach((index) => {
        const trackingDatasets = datasetsByIndexName[index];
        if (!trackingDatasets) {
          datasetsByIndexName[index] = [];
        }
        datasetsByIndexName[index].push(dataset.name);
      });
    });

    const nonRemoteIndexNames = allNames.filter((name) => !name.includes(':'));

    if (nonRemoteIndexNames.length) {
      const settingsResponse = await esClient.client.indices.getSettings({
        index: allNames.filter((name) => !name.includes(':')),
        filter_path: '*.settings.index.creation_date',
      });

      Object.entries(settingsResponse).forEach(([concreteIndexName, indexState]) => {
        if (!indexState.settings?.creation_date) {
          return;
        }
        const creationDate = new Date(indexState.settings.creation_date).getTime();

        const datasetNames = datasetsByIndexName[concreteIndexName];

        datasetNames.forEach((datasetName) => {
          const dataset = datasetsByName[datasetName];
          if (!dataset) {
            return;
          }
          if (!dataset.creation_date || dataset.creation_date > creationDate) {
            dataset.creation_date = creationDate;
          }
        });
      });
    }

    return {
      datasets: allDatasets.map((dataset) => {
        return {
          name: dataset.name,
          creation_date: dataset.creation_date,
          type: dataset.type,
        };
      }),
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
          data: { process },
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
