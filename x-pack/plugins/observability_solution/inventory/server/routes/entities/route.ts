/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { keyBy, memoize } from 'lodash';
import pLimit from 'p-limit';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import moment from 'moment';
import type { Observable } from 'rxjs';
import { z } from '@kbn/zod';
import type { Dataset } from '../../../common/datasets';
import type { EntityDefinition, EntityTypeDefinition } from '../../../common/entities';
import { createDatasetMatcher } from '../../../common/utils/create_dataset_matcher';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getDatasets } from './get_datasets';
import {
  ExtractServiceDefinitionOutputCompleteEvent,
  extractServiceDefinitions,
} from './extract_service_definitions';

export const listDatasetsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/datasets',
  params: z.object({
    query: z
      .object({
        indexPatterns: z.string(),
      })
      .optional(),
  }),
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

export const listServiceDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/service_definitions',
  options: {
    tags: ['access:inventory'],
  },
  params: t.partial({
    body: t.partial({
      indexPatterns: t.array(t.string),
    }),
  }),
  handler: async ({
    context,
    params,
    plugins,
    request,
    logger,
  }): Promise<{ serviceDefinitions: EntityDefinition[]; datasetsWithUncoveredData: string[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    async function getDatasetsFromIndexPattern() {
      const fetchedDatasets = await getDatasets({
        esClient,
        indexPatterns: params?.body?.indexPatterns,
      });

      return fetchedDatasets.map((dataset) => dataset.name);
    }

    async function fetchEntityDefinitions() {
      const entityManagerStart = await plugins.entityManager.start();
      const client = await entityManagerStart.getScopedClient({ request });

      return await client.getEntityDefinitions({
        page: 1,
        perPage: 10000,
      });
    }

    const [datasets, entityDefinitions] = await Promise.all([
      getDatasetsFromIndexPattern(),
      fetchEntityDefinitions(),
    ]);

    const serviceDefinitions = entityDefinitions.definitions.filter(
      (definition) => definition.type === 'service'
    );

    const getMatcher = memoize((indexPattern: string) => {
      return createDatasetMatcher(indexPattern, false);
    });

    const serviceDefinitionsByDatasetName = Object.fromEntries(
      datasets.map((dataset) => [dataset, [] as typeof serviceDefinitions])
    );

    serviceDefinitions.forEach((definition) => {
      datasets.forEach((dataset) => {
        if (
          definition.indexPatterns.some((indexPattern) => {
            return getMatcher(indexPattern).match(dataset);
          })
        ) {
          serviceDefinitionsByDatasetName[dataset].push(definition);
        }
      });
    });

    const limiter = pLimit(5);

    const client = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const datasetsWithUncoveredData = await Promise.all(
      datasets.map(async (dataset) => {
        const definitions = serviceDefinitionsByDatasetName[dataset];
        if (!definitions.length) {
          return {
            dataset,
            hits: true,
          };
        }
        const allResults = await Promise.all(
          serviceDefinitionsByDatasetName[dataset].map((definition) => {
            return limiter(() =>
              client
                .search('get_uncovered_data_for_dataset', {
                  index: dataset,
                  size: 0,
                  terminate_after: 1,
                  track_total_hits: 1,
                  query: {
                    bool: {
                      must_not: [...kqlQuery(definition.filter)],
                    },
                  },
                })
                .then((response) => {
                  return response.hits.total.value > 0;
                })
            );
          })
        );

        return {
          dataset,
          hits: allResults.includes(false),
        };
      })
    );

    return {
      serviceDefinitions: Object.values(serviceDefinitionsByDatasetName)
        .flat()
        .map((definition) => {
          return {
            field: definition.identityFields[0].field,
            filter: definition.filter,
            index: definition.indexPatterns,
            type: 'service',
          };
        }),
      datasetsWithUncoveredData: datasetsWithUncoveredData
        .filter((dataset) => dataset.hits)
        .map((dataset) => dataset.dataset),
    };
  },
});

export const extractServiceDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/service_definitions/extract',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      datasets: t.array(t.string),
      connectorId: t.string,
    }),
  }),
  handler: async ({
    logger,
    context,
    plugins,
    params,
    request,
  }): Promise<Observable<ExtractServiceDefinitionOutputCompleteEvent>> => {
    const { datasets, connectorId } = params.body;

    const end = moment();
    const start = moment(end).subtract(24, 'hour');

    const [coreContext, inferenceStart, dataViewsStart] = await Promise.all([
      context.core,
      plugins.inference.start(),
      plugins.dataViews.start(),
    ]);

    const inferenceClient = inferenceStart.getClient({ request });

    return extractServiceDefinitions({
      inferenceClient,
      connectorId,
      start: start.valueOf(),
      end: end.valueOf(),
      datasets,
      dataViewsService: await dataViewsStart.dataViewsServiceFactory(
        coreContext.savedObjects.client,
        coreContext.elasticsearch.client.asCurrentUser
      ),
      esClient: createObservabilityEsClient({
        client: coreContext.elasticsearch.client.asCurrentUser,
        logger,
        plugin: 'inventory',
      }),
      logger,
    });
  },
});

export const listEntityTypesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity_types',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ plugins, request }): Promise<{ definitions: EntityTypeDefinition[] }> => {
    return {
      definitions: [
        {
          label: i18n.translate('xpack.inventory.entityTypeLabels.datasets', {
            defaultMessage: 'Datasets',
          }),
          icon: 'pipeNoBreaks',
          type: 'dataset',
          count: 0,
        },
      ],
    };
  },
});

export const entitiesRoutes = {
  ...listEntityTypesRoute,
  ...listServiceDefinitionsRoute,
  ...extractServiceDefinitionsRoute,
  ...listDatasetsRoute,
};
