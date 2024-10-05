/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { EntitiesAPIClient, createEntitiesAPIClient } from './api';
import type {
  ConfigSchema,
  EntitiesAPIPublicSetup,
  EntitiesAPIPublicStart,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies,
} from './types';

export class EntitiesAPIPlugin
  implements
    Plugin<
      EntitiesAPIPublicSetup,
      EntitiesAPIPublicStart,
      EntitiesAPISetupDependencies,
      EntitiesAPIStartDependencies
    >
{
  logger: Logger;
  entitiesAPIClient!: EntitiesAPIClient;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<EntitiesAPIStartDependencies, EntitiesAPIPublicStart>,
    pluginsSetup: EntitiesAPISetupDependencies
  ): EntitiesAPIPublicSetup {
    const entitiesAPIClient = (this.entitiesAPIClient = createEntitiesAPIClient(coreSetup));

    return {
      entitiesAPIClient,
    };
  }

  start(coreStart: CoreStart, pluginsStart: EntitiesAPIStartDependencies): EntitiesAPIPublicStart {
    return {
      entitiesAPIClient: this.entitiesAPIClient,
    };
  }
}
