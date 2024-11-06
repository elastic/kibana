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
import { EntitiesAPIRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  EntitiesAPIServerSetup,
  EntitiesAPIServerStart,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies,
} from './types';

export class EntitiesAPIPlugin
  implements
    Plugin<
      EntitiesAPIServerSetup,
      EntitiesAPIServerStart,
      EntitiesAPISetupDependencies,
      EntitiesAPIStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<EntitiesAPIStartDependencies, EntitiesAPIServerStart>,
    pluginsSetup: EntitiesAPISetupDependencies
  ): EntitiesAPIServerSetup {
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
        }) as unknown as EntitiesAPIRouteHandlerResources['plugins'],
      },
    });
    return {};
  }

  start(core: CoreStart, pluginsStart: EntitiesAPIStartDependencies): EntitiesAPIServerStart {
    return {};
  }
}
