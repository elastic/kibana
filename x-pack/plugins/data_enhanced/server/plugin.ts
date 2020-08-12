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
  Logger,
} from '../../../../src/core/server';
import { ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
  usageProvider,
} from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider } from './search';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { ApiResponse } from '@elastic/elasticsearch';

interface SetupDependencies {
  data: DataPluginSetup;
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class EnhancedDataServerPlugin implements Plugin<void, void, SetupDependencies> {
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('data_enhanced');
  }

  public setup(core: CoreSetup<DataPluginStart>, deps: SetupDependencies) {
    const usage = deps.usageCollection ? usageProvider(core) : undefined;

    deps.features.registerFeature({
      id: 'backgroundSearch',
      name: 'Background Search',
      app: [],
      privileges: {
        all: {
          app: [],
          api: [],
          ui: ['runBeyondTimeout'],
          savedObject: {
            all: ['background-session'],
            read: [],
          },
        },
        read: {
          app: [],
          api: [],
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    });

    deps.data.search.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );
  }

  public start(core: CoreStart) {}

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
