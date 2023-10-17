/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { JobRegistry } from './jobs/job_registry';

import { registerServerRoutes } from './routes/register_routes';
import { HighCardinalityIndexerRouteHandlerResources } from './routes/types';
import {
  HighCardinalityIndexerPluginSetup,
  HighCardinalityIndexerPluginStart,
  HighCardinalityIndexerPluginSetupDependencies,
  HighCardinalityIndexerPluginStartDependencies,
} from './types';

export class HighCardinalityIndexerPlugin
  implements
    Plugin<
      HighCardinalityIndexerPluginSetup,
      void,
      HighCardinalityIndexerPluginSetupDependencies,
      HighCardinalityIndexerPluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }
  public setup(
    core: CoreSetup<
      HighCardinalityIndexerPluginStartDependencies,
      HighCardinalityIndexerPluginStart
    >,
    plugins: HighCardinalityIndexerPluginSetupDependencies
  ): HighCardinalityIndexerPluginSetup {
    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof HighCardinalityIndexerPluginStartDependencies
            ];
          }),
      };
    }) as HighCardinalityIndexerRouteHandlerResources['plugins'];

    const jobRegistry = new JobRegistry();

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        logger: this.logger,
        plugins: routeHandlerPlugins,
        jobRegistry,
      },
    });

    return {};
  }

  start() {}

  stop() {}
}
