/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from '@kbn/core-plugins-server';
import type { KibanaRequest, PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { schema, type TypeOf } from '@kbn/config-schema';
import { registerServerRoutes } from './routes';
import { createDataDefinitionRegistry } from './data_definition_registry';
import {
  DataDefinitionRegistryClient,
  DynamicDataDefinition,
  StaticDataDefinition,
} from './data_definition_registry/types';

export const config = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type DataDefinitionRegistryConfig = TypeOf<typeof config>;

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface DataDefinitionRegistryServerSetupDependencies {}

export interface DataDefinitionRegistryServerStartDependencies {}

export interface DataDefinitionRegistryServerSetup {
  registerDynamicDefinition(options: DynamicDataDefinition): void;
  registerDefinition(definition: StaticDataDefinition): void;
}

export interface DataDefinitionRegistryServerStart {
  getClientWithRequest: (request: KibanaRequest) => DataDefinitionRegistryClient;
}

export type IDataDefinitionRegistryServerPluginInitializer = PluginInitializer<
  DataDefinitionRegistryServerSetup,
  DataDefinitionRegistryServerStart,
  DataDefinitionRegistryServerSetupDependencies,
  DataDefinitionRegistryServerStartDependencies
>;

export type IDataDefinitionRegistryServerPlugin = Plugin<
  DataDefinitionRegistryServerSetup,
  DataDefinitionRegistryServerStart,
  DataDefinitionRegistryServerSetupDependencies,
  DataDefinitionRegistryServerStartDependencies
>;

export function createPlugin(
  context: PluginInitializerContext<ConfigSchema>
): IDataDefinitionRegistryServerPlugin {
  const registry = createDataDefinitionRegistry();

  return {
    setup(coreSetup, pluginsSetup) {
      const startServicesPromise = coreSetup
        .getStartServices()
        .then(([_coreStart, pluginsStart]) => pluginsStart);

      registerServerRoutes({
        core: coreSetup,
        logger: context.logger.get(),
        dependencies: {
          plugins: mapValues(pluginsSetup, (value, key) => {
            return {
              start: () =>
                startServicesPromise.then(
                  (startServices) => startServices[key as keyof typeof startServices]
                ),
              setup: value,
            };
          }),
        },
      });

      return {
        registerDefinition: registry.registerDefinition,
        registerDynamicDefinition: registry.registerDynamicDefinition,
      };
    },
    start() {
      return {
        getClientWithRequest: (request) => {
          return registry.getClientWithRequest(request);
        },
      };
    },
  };
}
