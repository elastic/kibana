/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { Plugin } from '@kbn/core-plugins-server';
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import { mapValues, pick } from 'lodash';
import { createDataDefinitionRegistry } from './data_definition_registry';
import { DataDefinitionRegistry } from './data_definition_registry/types';
import { registerServerRoutes } from './routes';

export const config = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type DataDefinitionRegistryConfig = TypeOf<typeof config>;

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface DataDefinitionRegistryServerSetupDependencies {}

export interface DataDefinitionRegistryServerStartDependencies {}

export type DataDefinitionRegistryServerSetup = Pick<
  DataDefinitionRegistry,
  'registerDynamicDataDefinition' | 'registerStaticDataDefinition'
>;

export type DataDefinitionRegistryServerStart = Pick<
  DataDefinitionRegistry,
  'getClientWithRequest'
>;

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
  let registry!: DataDefinitionRegistry;

  return {
    setup(coreSetup, pluginsSetup) {
      const startServicesPromise = coreSetup
        .getStartServices()
        .then(([_coreStart, pluginsStart]) => pluginsStart);

      const logger = context.logger.get();

      registry = createDataDefinitionRegistry({ coreSetup, logger });

      registerServerRoutes({
        core: coreSetup,
        logger,
        dependencies: {
          registry,
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

      return pick(registry, 'registerStaticDataDefinition', 'registerDynamicDataDefinition');
    },
    start() {
      return pick(registry, 'getClientWithRequest');
    },
  };
}
