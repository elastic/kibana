/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { DataDefinitionRegistryServerRouteRepository } from '@kbn/data-definition-registry-plugin/server';
import { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import { once } from 'lodash';
import { lastValueFrom, map } from 'rxjs';
import type { IDataDefinitionRegistryPublicPlugin } from './types';

export function createPlugin(
  context: PluginInitializerContext
): IDataDefinitionRegistryPublicPlugin {
  const getDataDefinitionRegistryClient = once((core: CoreSetup | CoreStart) => {
    return createRepositoryClient<DataDefinitionRegistryServerRouteRepository>(core);
  });

  return {
    setup() {
      return {};
    },
    start(core, plugins) {
      const client = getDataDefinitionRegistryClient(core);
      return {
        suggestQuery: async (options) => {
          return lastValueFrom(
            client
              .stream('GET /internal/data_definition/suggest_query', {
                signal: options.signal,
                params: {
                  query: {
                    start: options.start,
                    end: options.end,
                    index: options.index,
                    kuery: options.kuery,
                    query: options.query,
                    connectorId: options.connectorId,
                  },
                },
              })
              .pipe(
                map(({ output }) => {
                  return output;
                })
              )
          );
        },
        getQueries: (options) => {
          return client
            .fetch('GET /internal/data_definition/queries', {
              signal: options.signal,
              params: {
                query: {
                  start: options.start,
                  end: options.end,
                  index: options.index,
                  kuery: options.kuery,
                },
              },
            })
            .then(({ queries }) => queries);
        },
      };
    },
  };
}
