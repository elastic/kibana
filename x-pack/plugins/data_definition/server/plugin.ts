/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core-plugins-server';
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { schema, type TypeOf } from '@kbn/config-schema';
import type {
  DataDefinitionRegistryServerSetup,
  DataDefinitionRegistryServerStart,
} from '@kbn/data-definition-registry-plugin/server';
import { registerServerRoutes } from './routes/repository';

export const config = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type DataDefinitionConfig = TypeOf<typeof config>;

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface DataDefinitionServerSetupDependencies {
  dataDefinitionRegistry: DataDefinitionRegistryServerSetup;
}

export interface DataDefinitionServerStartDependencies {
  dataDefinitionRegistry: DataDefinitionRegistryServerStart;
}

export interface DataDefinitionServerSetup {}

export interface DataDefinitionServerStart {}

export interface DataDefinitionClient {}

export type IDataDefinitionServerPluginInitializer = PluginInitializer<
  DataDefinitionServerSetup,
  DataDefinitionServerStart,
  DataDefinitionServerSetupDependencies,
  DataDefinitionServerStartDependencies
>;

export type IDataDefinitionServerPlugin = Plugin<
  DataDefinitionServerSetup,
  DataDefinitionServerStart,
  DataDefinitionServerSetupDependencies,
  DataDefinitionServerStartDependencies
>;

export function createPlugin(
  context: PluginInitializerContext<ConfigSchema>
): IDataDefinitionServerPlugin {
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

      return {};
    },
    start() {
      return {};
    },
  };
}
