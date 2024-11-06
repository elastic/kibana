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
import { StreamsAPIRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  StreamsAPIServerSetup,
  StreamsAPIServerStart,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies,
} from './types';

export class StreamsAPIPlugin
  implements
    Plugin<
      StreamsAPIServerSetup,
      StreamsAPIServerStart,
      StreamsAPISetupDependencies,
      StreamsAPIStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<StreamsAPIStartDependencies, StreamsAPIServerStart>,
    pluginsSetup: StreamsAPISetupDependencies
  ): StreamsAPIServerSetup {
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
        }) as unknown as StreamsAPIRouteHandlerResources['plugins'],
      },
    });
    return {};
  }

  start(core: CoreStart, pluginsStart: StreamsAPIStartDependencies): StreamsAPIServerStart {
    return {};
  }
}
