/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { mapValues } from 'lodash';
import { registerServerRoutes } from './routes/register_routes';
import { InventoryRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';

export class InventoryPlugin
  implements
    Plugin<
      InventoryServerSetup,
      InventoryServerStart,
      InventorySetupDependencies,
      InventoryStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InventoryStartDependencies, InventoryServerStart>,
    pluginsSetup: InventorySetupDependencies
  ): InventoryServerSetup {
    const startServicesPromise = coreSetup
      .getStartServices()
      .then(([_coreStart, pluginsStart]) => pluginsStart);

    registerServerRoutes({
      core: coreSetup,
      logger: this.logger,
      dependencies: {
        plugins: mapValues(pluginsSetup, (value, key) => {
          return {
            start: () =>
              startServicesPromise.then(
                (startServices) => startServices[key as keyof typeof startServices]
              ),
            setup: () => value,
          };
        }) as unknown as InventoryRouteHandlerResources['plugins'],
      },
    });
    return {};
  }

  start(core: CoreStart, pluginsStart: InventoryStartDependencies): InventoryServerStart {
    return {};
  }
}
