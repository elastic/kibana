/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pLimit from 'p-limit';
import { castArray, uniq } from 'lodash';
import {
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DataDefinitionSource,
  DynamicDataDefinition,
  StaticDataDefinition,
} from './types';

type DynamicDefinitionsBySourceMap = Partial<{
  [key in DataDefinitionSource['type']]: Extract<DataDefinitionSource, { type: key }> extends {
    name: string;
  }
    ? Map<string, DynamicDataDefinition>
    : DynamicDataDefinition;
}>;

export function createDataDefinitionRegistry(): DataDefinitionRegistry {
  const internalDefinitions = new Set<StaticDataDefinition>();
  const dynamicDefinitionsMap: DynamicDefinitionsBySourceMap = {
    rule: new Map(),
    visualization: new Map(),
  };

  const allDefinitions = new Map<string, DataDefinition>();

  function getDynamicDefinitionForSource(source: Omit<DataDefinitionSource, 'instance'>) {
    if (source.type === 'slo') {
      return dynamicDefinitionsMap[source.type];
    }
    return source.name ? dynamicDefinitionsMap[source.type]?.get(source.name) : undefined;
  }

  function setDynamicDefinitionForSource(definition: DynamicDataDefinition) {
    if (definition.source.type === 'slo') {
      dynamicDefinitionsMap[definition.source.type] = definition;
    } else if (definition.source.name) {
      dynamicDefinitionsMap[definition.source.type]!.set(definition.source.name, definition);
    }
  }

  function getApplicableStaticDefinitions() {
    return Array.from(internalDefinitions.values());
  }

  return {
    registerDefinition: (definition) => {
      internalDefinitions.add(definition);
      allDefinitions.set(definition.id, definition);
    },
    registerDynamicDefinition: (definition) => {
      const currentDefinition = getDynamicDefinitionForSource(definition.source);
      if (currentDefinition) {
        throw new Error(
          `Definition for ${definition.source.type}/${definition.source.name} already exists`
        );
      }
      allDefinitions.set(definition.id, definition);
      setDynamicDefinitionForSource(definition);
    },
    getClientWithRequest: (request) => {
      const client: DataDefinitionRegistryClient = {
        getDataScopes: async (sources, options) => {
          const sourcesWithDefinitions = sources.map((source) => ({
            source,
            definition: getDynamicDefinitionForSource(source),
          }));

          const staticScopes = await Promise.all(
            getApplicableStaticDefinitions().map(async (definition) => ({
              scope: await definition.getDataScope({ ...options, request }),
            }))
          );

          const dynamicScopes = sourcesWithDefinitions.flatMap(({ source, definition }) => {
            const scope = definition?.getDataScope({ ...options, source });
            return scope ? [{ scope, source }] : [];
          });

          return [
            ...staticScopes.map(({ scope }) => ({
              scope: { ...scope, index: uniq(castArray(scope.index)).sort() },
            })),
            ...dynamicScopes,
          ];
        },
        getMetrics: async (sources, options) => {
          const sourcesWithDefinitions = sources.map((source) => ({
            source,
            definition: getDynamicDefinitionForSource(source),
          }));

          const staticMetricDefinitions = await Promise.all(
            getApplicableStaticDefinitions().map(async (definition) => {
              const [scope, metrics] = await Promise.all([
                definition.getDataScope({ ...options, request }),
                definition.getMetrics({ ...options, request }),
              ]);
              return {
                scope,
                metrics,
              };
            })
          );

          const dynamicMetricDefinitions = sourcesWithDefinitions.flatMap(
            ({ source, definition }) => {
              if (!definition) {
                return [];
              }
              return [
                {
                  source,
                  scope: definition.getDataScope({ ...options, source }),
                  metrics: definition.getMetrics({ ...options, source }),
                },
              ];
            }
          );

          return [...staticMetricDefinitions, ...dynamicMetricDefinitions];
        },
        getTimeseries: async (sources, options) => {
          const { start, end, bucketSize, query } = options;
          const limiter = pLimit(25);
          const metricsById = new Map(
            options.metrics.map((metric) => [[metric.id, metric.definitionId].join('/'), metric])
          );

          const selectedMetrics = (await client.getMetrics(sources, options)).flatMap(
            ({ metrics, source }) => {
              return metrics.flatMap((metric) => {
                const id = [metric.id, metric.definitionId].join('/');

                if (metricsById.get(id)) {
                  return [
                    {
                      metric,
                      source,
                    },
                  ];
                }
                return [];
              });
            }
          );

          const allResults = await Promise.all(
            selectedMetrics.map(({ metric, source }) => {
              const definition = allDefinitions.get(metric.definitionId);
              if (!definition) {
                throw new Error(
                  `Definition ${metric.definitionId} not found for metric ${metric.id}`
                );
              }

              if ('source' in definition && !source) {
                throw new Error(`Expected source to be defined for metric ${metric.id}`);
              }

              if ('source' in definition) {
                return limiter(() =>
                  definition.getTimeseries({
                    request,
                    source: source!,
                    bucketSize,
                    start,
                    end,
                    query,
                    metrics: [metric],
                  })
                );
              }

              return limiter(() =>
                definition.getTimeseries({
                  request,
                  bucketSize,
                  start,
                  end,
                  query,
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
}
