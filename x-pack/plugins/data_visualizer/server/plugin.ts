/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { Logger } from 'kibana/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { StartDeps } from './types';
import { dataVisualizerRoutes } from './routes';
import { setupCapabilities } from './capabilities';

interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}

export class DataVisualizerPlugin implements Plugin {
  private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this._logger = initializerContext.logger.get();
  }

  async setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    dataVisualizerRoutes(coreSetup, this._logger);
    setupCapabilities(coreSetup);
  }

  start(core: CoreStart) {}
}
