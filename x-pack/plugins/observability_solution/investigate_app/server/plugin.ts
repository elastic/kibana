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
import { InvestigateAppRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  InvestigateAppServerSetup,
  InvestigateAppServerStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
} from './types';

export class InvestigateAppPlugin
  implements
    Plugin<
      InvestigateAppServerSetup,
      InvestigateAppServerStart,
      InvestigateAppSetupDependencies,
      InvestigateAppStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InvestigateAppStartDependencies, InvestigateAppServerStart>,
    pluginsSetup: InvestigateAppSetupDependencies
  ): InvestigateAppServerSetup {
    const routeHandlerPlugins = mapValues(pluginsSetup, (value, key) => {
      return {
        setup: value,
        start: () =>
          coreSetup.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return (pluginsStartContracts as any)[key];
          }),
      };
    }) as InvestigateAppRouteHandlerResources['plugins'];

    registerServerRoutes({
      core: coreSetup,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
      },
    });

    return {};
  }

  start(core: CoreStart, pluginsStart: InvestigateAppStartDependencies): InvestigateAppServerStart {
    return {};
  }
}
