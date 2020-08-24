/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/server';
import { ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
  usageProvider,
} from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider } from './search';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

interface SetupDependencies {
  data: DataPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class EnhancedDataServerPlugin implements Plugin<void, void, SetupDependencies> {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<DataPluginStart>, deps: SetupDependencies) {
    const usage = deps.usageCollection ? usageProvider(core) : undefined;

    deps.data.search.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(this.initializerContext.config.legacy.globalConfig$, usage)
    );
  }

  public start(core: CoreStart) {}

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
