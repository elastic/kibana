/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreSetup, Logger } from '@kbn/core/server';
import { from, map, shareReplay } from 'rxjs';
import { createIndexPatternMatcher } from './create_index_pattern_matcher';
import { getDataStreamsForQuery } from './get_data_streams_for_query';
import {
  DataDefinition,
  DataDefinitionRegistry,
  DataDefinitionRegistryClient,
  DynamicDataDefinition,
  StaticDataDefinition,
} from './types';

export function createDataDefinitionRegistry({
  coreSetup,
  logger,
}: {
  coreSetup: CoreSetup;
  logger: Logger;
}): DataDefinitionRegistry {
  const staticDefinitions = new Set<StaticDataDefinition>();
  const dynamicDefinitions = new Set<DynamicDataDefinition>();

  const allDefinitions = new Map<string, DataDefinition>();

  const registry: DataDefinitionRegistry = {
    registerStaticDataDefinition: ({ id, getQueries }) => {
      if (allDefinitions.get(id)) {
        throw new Error(`Definition id ${id} already registered`);
      }

      const definition: StaticDataDefinition = {
        id,
        getQueries,
      };

      allDefinitions.set(definition.id, definition);
      staticDefinitions.add(definition);
    },
    registerDynamicDataDefinition: ({ id, getAssets, getQueries }) => {
      const definition: DynamicDataDefinition = {
        id,
        getAssets,
        getQueries: getQueries as DynamicDataDefinition['getQueries'],
      };

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
          shareReplay(1)
        );
      }

      const client: DataDefinitionRegistryClient = {
        getAssets: async (options) => {
          const { query, start, end, index } = options;

          const optionsWithClient = {
            start,
            end,
            dataStreams$: createDataStreams$({ query, index }),
            ...withClients,
          };

          const allAssets = await Promise.all(
            Array.from(allDefinitions.values()).flatMap((definition) => {
              if ('getAssets' in definition) {
                return definition.getAssets(optionsWithClient);
              }
              return [];
            })
          );

          return allAssets.flat();
        },
        getQueries: async (options) => {
          const { query, start, end, index } = options;

          const optionsWithClient = {
            start,
            end,
            dataStreams$: createDataStreams$({ query, index }),
            ...withClients,
          };

          const [dynamicQueryTemplates, staticQueryTemplates] = await Promise.all([
            Promise.all(
              Array.from(dynamicDefinitions.values()).map((dynamicDefinition) => {
                return dynamicDefinition.getAssets(optionsWithClient).then((assets) => {
                  return dynamicDefinition.getQueries({
                    ...optionsWithClient,
                    assets,
                  });
                });
              })
            ).then((queries) => queries.flat()),
            Promise.all(
              Array.from(staticDefinitions.values()).map((staticDefinition) => {
                return staticDefinition.getQueries(optionsWithClient);
              })
            ).then((queries) => queries.flat()),
          ]);

          return [...dynamicQueryTemplates, ...staticQueryTemplates];
        },
      };

      return client;
    },
  };

  return registry;
}
