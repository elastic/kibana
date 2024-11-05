/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Logger } from '@kbn/core/server';
import { compact, groupBy, mapValues } from 'lodash';
import pLimit from 'p-limit';
import {
  ClientGetMetricDefinitionResult,
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DynamicDataDefinition,
  DynamicDataSource,
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

  function getDynamicDefinitionForSource(
    source: Omit<DynamicDataSource, 'instance' | 'properties'>
  ) {
    const definitionsForType = dynamicDefinitions.get(source.type);

    if (!definitionsForType) {
      return undefined;
    }

    const name = source.name ?? NAME_ALL;

    return definitionsForType.get(name);
  }

  function setDynamicDefinitionForSource(definition: DynamicDataDefinition) {
    let definitionsForType = dynamicDefinitions.get(definition.source.type);
    if (!definitionsForType) {
      definitionsForType = new Map<string, DynamicDataDefinition>();
      dynamicDefinitions.set(definition.source.type, definitionsForType);
    }

    definitionsForType.set(definition.source.name ?? NAME_ALL, definition);
  }

  function getApplicableStaticDefinitions() {
    return Array.from(staticDefinitions.values());
  }

  function getSourcesGroupedByDefinitionId(sources: DynamicDataSource[]) {
    const sourcesWithDefinitionIds = sources.map((source) => ({
      source,
      definitionId: getDynamicDefinitionForSource(source)?.id,
    }));

    const sourcesByDefinitionId = groupBy(
      sourcesWithDefinitionIds.filter(
        (source): source is Omit<typeof source, 'definitionId'> & { definitionId: string } =>
          !!source.definitionId
      ),
      ({ definitionId }) => definitionId
    );

    return sourcesByDefinitionId;
  }

  const registry: DataDefinitionRegistry = {
    registerStaticDataDefinition: (
      metadata: { id: string },
      ...args:
        | [StaticDataDefinition['getScopes']]
        | [
            StaticDataDefinition['getScopes'],
            StaticDataDefinition['getMetrics'],
            StaticDataDefinition['getTimeseries']
          ]
    ) => {
      if (allDefinitions.get(metadata.id)) {
        throw new Error(`Definition id ${metadata.id} already registered`);
      }

      const definition: StaticDataDefinition = {
        id: metadata.id,
        getScopes: args[0],
        getMetrics: args[1],
        getTimeseries: args[2],
      };

      allDefinitions.set(definition.id, definition);
      staticDefinitions.add(definition);
    },
    registerDynamicDataDefinition: (
      metadata: { id: string; source: { type: string; name?: string } },
      ...args:
        | [DynamicDataDefinition['getSources'], DynamicDataDefinition['getScopes']]
        | [
            DynamicDataDefinition['getSources'],
            DynamicDataDefinition['getScopes'],
            DynamicDataDefinition['getMetrics'],
            DynamicDataDefinition['getTimeseries']
          ]
    ) => {
      if (getDynamicDefinitionForSource(metadata.source)) {
        throw new Error(
          `Definition for source ${metadata.source.type}, ${metadata.source.name} already registered `
        );
      }

      const definition: DynamicDataDefinition = {
        id: metadata.id,
        source: metadata.source,
        getSources: args[0],
        getScopes: args[1],
        getMetrics: args[2],
        getTimeseries: args[3],
      };

      setDynamicDefinitionForSource(definition);
      allDefinitions.set(definition.id, definition);
    },

    getClientWithRequest: async (request) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request);
      const soClient = coreStart.savedObjects.getScopedClient(request);

      const withClients = { esClient, soClient, request };

      const client: DataDefinitionRegistryClient = {
        getScopes: async (sources, options) => {
          const sourcesByDefinitionId = getSourcesGroupedByDefinitionId(sources);
          const optionsWithClient = { ...options, ...withClients };

          const staticScopes = (
            await Promise.all(
              getApplicableStaticDefinitions().map(
                async (definition) => await definition.getScopes(optionsWithClient)
              )
            )
          ).flat();

          const dynamicScopes = Object.entries(sourcesByDefinitionId)
            .map(([definitionId, sourcesForDefinition]) => {
              const definition = allDefinitions.get(definitionId)! as DynamicDataDefinition;
              return definition.getScopes(
                sourcesForDefinition.map(({ source }) => source),
                optionsWithClient
              );
            })
            .flat();

          return [...staticScopes, ...dynamicScopes];
        },
        getMetrics: async (sources, options) => {
          const optionsWithClient = { ...options, ...withClients };

          const sourcesByDefinitionId = getSourcesGroupedByDefinitionId(sources);

          const staticMetricDefinitions: ClientGetMetricDefinitionResult[] = compact(
            await Promise.all(
              getApplicableStaticDefinitions().map(async (definition) => {
                const metrics = await definition.getMetrics?.(optionsWithClient);

                if (metrics) {
                  return mapValues(metrics, (metric) => ({
                    ...metric,
                    definitionId: definition.id,
                  }));
                }

                return undefined;
              })
            )
          );

          const dynamicMetricDefinitions: ClientGetMetricDefinitionResult[] = compact(
            Object.entries(sourcesByDefinitionId).map(([definitionId, sourcesForDefinition]) => {
              const definition = allDefinitions.get(definitionId)! as DynamicDataDefinition;
              const metrics = definition.getMetrics?.(
                sourcesForDefinition.map(({ source }) => source),
                optionsWithClient
              );

              if (metrics) {
                return mapValues(metrics, (metric) => ({ ...metric, definitionId: definition.id }));
              }
              return undefined;
            })
          );

          const metricResult: ClientGetMetricDefinitionResult = {};

          const allMetricResults = [
            ...compact(staticMetricDefinitions),
            ...compact(dynamicMetricDefinitions),
          ];

          allMetricResults.forEach((partialMetricResult) => {
            Object.keys(partialMetricResult).forEach((metricId) => {
              if (metricResult[metricId]) {
                logger.warn(`Overriding metric id ${metricId}`);
              }
              metricResult[metricId] = partialMetricResult[metricId];
            });
          });

          return metricResult;
        },
        getTimeseries: async (options) => {
          const optionsWithClient = { ...options, ...withClients };
          const limiter = pLimit(25);

          const allResults = await Promise.all(
            options.metrics.map((metric) => {
              const definition = allDefinitions.get(metric.definitionId);
              if (!definition) {
                throw new Error(
                  `Definition ${metric.definitionId} not found for metric ${metric.id}`
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
