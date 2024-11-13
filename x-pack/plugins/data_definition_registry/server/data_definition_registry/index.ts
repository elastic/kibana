/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Logger } from '@kbn/core/server';
import { groupBy, mapValues } from 'lodash';
import pLimit from 'p-limit';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { from, map, share } from 'rxjs';
import { createIndexPatternMatcher } from './create_index_pattern_matcher';
import { getDataStreamsForQuery } from './get_data_streams_for_query';
import {
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DynamicDataAsset,
  DynamicDataDefinition,
  GetMetricDefinitionResult,
  InternalGetMetricDefinitionOptions,
  InternalGetMetricDefinitionResult,
  InternalGetTimeseriesOptionsOf,
  InternalGetTimeseriesResult,
  StaticDataDefinition,
} from './types';

const NAME_ALL = '_all_';

export function createDataDefinitionRegistry({
  coreSetup,
  logger,
}: {
  coreSetup: CoreSetup;
  logger: Logger;
}): DataDefinitionRegistry {
  const staticDefinitions = new Set<StaticDataDefinition>();
  const dynamicDefinitions = new Map<string, Map<string, DynamicDataDefinition>>();

  const allDefinitions = new Map<string, DataDefinition>();

  function getDynamicDefinitionForAsset(asset: Omit<DynamicDataAsset, 'instance' | 'properties'>) {
    const definitionsForType = dynamicDefinitions.get(asset.type);

    if (!definitionsForType) {
      return undefined;
    }

    const name = asset.name ?? NAME_ALL;

    return definitionsForType.get(name);
  }

  function setDynamicDefinitionForSource(definition: DynamicDataDefinition) {
    let definitionsForType = dynamicDefinitions.get(definition.asset.type);
    if (!definitionsForType) {
      definitionsForType = new Map<string, DynamicDataDefinition>();
      dynamicDefinitions.set(definition.asset.type, definitionsForType);
    }

    definitionsForType.set(definition.asset.name ?? NAME_ALL, definition);
  }

  function getAssetsGroupedByDefinitionId(assets: DynamicDataAsset[]) {
    const assetsWithDefinitionIds = assets.map((asset) => ({
      asset,
      definitionId: getDynamicDefinitionForAsset(asset)?.id,
    }));

    const assetsByDefinitionId = groupBy(
      assetsWithDefinitionIds.filter(
        (asset): asset is Omit<typeof asset, 'definitionId'> & { definitionId: string } =>
          !!asset.definitionId
      ),
      ({ definitionId }) => definitionId
    );

    return mapValues(assetsByDefinitionId, (assetsForDefinition) =>
      assetsForDefinition.map(({ asset }) => asset)
    );
  }

  const registry: DataDefinitionRegistry = {
    registerStaticDataDefinition: (metadata, getMetricDefinitions, getTimeseries) => {
      if (allDefinitions.get(metadata.id)) {
        throw new Error(`Definition id ${metadata.id} already registered`);
      }

      const definition: StaticDataDefinition = {
        id: metadata.id,
        getMetricDefinitions,
        getTimeseries: getTimeseries as StaticDataDefinition['getTimeseries'],
      };

      allDefinitions.set(definition.id, definition);
      staticDefinitions.add(definition);
    },
    registerDynamicDataDefinition: (
      metadata: {
        id: string;
        asset: {
          type: string;
          name?: string;
        };
      },
      getScopes: DynamicDataDefinition['getScopes'],
      getMetricDefinitions?: (
        options: InternalGetMetricDefinitionOptions,
        assets?: DynamicDataAsset[]
      ) => Promise<InternalGetMetricDefinitionResult>,
      getTimeseries?: (
        options: InternalGetTimeseriesOptionsOf<InternalGetMetricDefinitionResult>
      ) => Promise<InternalGetTimeseriesResult>
    ) => {
      if (getDynamicDefinitionForAsset(metadata.asset)) {
        throw new Error(
          `Definition for asset ${metadata.asset.type}, ${metadata.asset.name} already registered `
        );
      }

      const definition: DynamicDataDefinition = {
        id: metadata.id,
        asset: metadata.asset,
        getScopes,
        getMetricDefinitions,
        getTimeseries,
      };

      setDynamicDefinitionForSource(definition);
      allDefinitions.set(definition.id, definition);
    },

    getClientWithRequest: async (request) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request);
      const soClient = coreStart.savedObjects.getScopedClient(request);

      const withClients = { esClient, soClient, request };

      function createDataStreams$({
        query,
        index,
      }: {
        query: QueryDslQueryContainer;
        index: string | string[];
      }) {
        return from(
          getDataStreamsForQuery({
            esClient: esClient.asCurrentUser,
            query,
            index,
          })
        ).pipe(
          map((dataStreams) => {
            return createIndexPatternMatcher(dataStreams);
          }),
          share()
        );
      }

      const client: DataDefinitionRegistryClient = {
        getScopes: async (options) => {
          const { query, start, end, index } = options;

          const optionsWithClient = {
            start,
            end,
            dataStreams$: createDataStreams$({ query, index }),
            ...withClients,
          };

          const allScopes = await Promise.all(
            Array.from(allDefinitions.values()).flatMap((definition) => {
              if ('getScopes' in definition) {
                return definition
                  .getScopes(optionsWithClient)
                  .then((scopesFromDefinition) =>
                    scopesFromDefinition.map((scope) => ({ ...scope, definitionId: definition.id }))
                  );
              }
              return [];
            })
          );

          return allScopes.flat();
        },
        getMetricDefinitions: async (options, assets) => {
          const { query, start, end, index } = options;

          const dataStreams = await getDataStreamsForQuery({
            esClient: esClient.asCurrentUser,
            query,
            index,
          });

          const optionsWithClient = {
            start,
            end,
            dataStreams$: createDataStreams$({ query, index }),
            ...withClients,
          };

          const assetsByDefinitionId = getAssetsGroupedByDefinitionId(assets ?? []);

          const allMetricDefinitions = await Promise.all(
            Array.from(allDefinitions.values()).flatMap((definition) => {
              if ('getMetricDefinitions' in definition && definition.getMetricDefinitions) {
                return definition
                  .getMetricDefinitions(optionsWithClient, assetsByDefinitionId[definition.id])
                  .then((metricDefinitionsFromDefinition) =>
                    mapValues(metricDefinitionsFromDefinition, (metricDef) => ({
                      ...metricDef!,
                      definitionId: definition.id,
                    }))
                  );
              }
              return [];
            })
          );

          const mergedMetricResult: GetMetricDefinitionResult = {};

          allMetricDefinitions.forEach((metricResult) => {
            Object.keys(metricResult).forEach((metricId) => {
              if (mergedMetricResult[metricId]) {
                logger.warn(`Overriding metric id ${metricId}`);
              }
              mergedMetricResult[metricId] = metricResult[metricId];
            });
          });

          return mergedMetricResult;
        },
        getTimeseries: async (options) => {
          const optionsWithClient = { ...options, ...withClients };
          const limiter = pLimit(25);

          const allResults = await Promise.all(
            options.metrics.map((metric) => {
              const definition = allDefinitions.get(metric.definitionId);
              if (!definition) {
                throw new Error(
                  `Definition ${metric.definitionId} not found for metric ${metric.metric.id}`
                );
              }

              const { getTimeseries } = definition;

              if (!getTimeseries) {
                throw new Error(`Definition ${metric.definitionId} does not support timeseries`);
              }

              return limiter(() =>
                getTimeseries({
                  ...optionsWithClient,
                  metrics: [metric],
                })
              );
            })
          );

          return allResults.flat();
        },
      };

      return client;
    },
  };

  return registry;
}
