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
import { PluginSetup as DataPluginSetup } from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider } from './search';
import { BackgroundSearchService } from './background_search/bg_search_service';
import { SecurityPluginSetup } from '../../security/server';

interface SetupDependencies {
  data: DataPluginSetup;
  security: SecurityPluginSetup;
}

export interface EnhancedDataPluginSetup {
  backgroundSearch: BackgroundSearchService;
}

export interface EnhancedDataPluginStart {
  backgroundSearch: BackgroundSearchService;
}

export class EnhancedDataServerPlugin
  implements Plugin<EnhancedDataPluginSetup, EnhancedDataPluginStart, SetupDependencies> {
  private readonly backgroundSearchService!: BackgroundSearchService;
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('enhanced-data');
    this.backgroundSearchService = new BackgroundSearchService(this.logger);
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    deps.data.search.registerSearchStrategyContext(
      this.initializerContext.opaqueId,
      'backgroundSearchService',
      () => this.backgroundSearchService
    );
    deps.data.search.registerSearchStrategyContext(
      this.initializerContext.opaqueId,
      'security',
      () => deps.security
    );
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider
    );

    return {
      backgroundSearch: this.backgroundSearchService,
    };
  }

  public start(core: CoreStart) {
    return {
      backgroundSearch: this.backgroundSearchService,
    };
  }

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
