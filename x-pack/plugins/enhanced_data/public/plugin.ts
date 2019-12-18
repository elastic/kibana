/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, Plugin } from '../../../../src/core/public';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';
import { ASYNC_SEARCH_STRATEGY, asyncSearchStrategyProvider } from './search/async_search_strategy';
import { enhancedEsSearchStrategyProvider } from './search/es_search';

interface SetupDependencies {
  data: DataPublicPluginSetup;
}

export class EnhancedDataPublicPlugin implements Plugin<void, void, SetupDependencies> {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { data }: SetupDependencies) {
    data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ASYNC_SEARCH_STRATEGY,
      asyncSearchStrategyProvider
    );
    data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider
    );
  }

  public start() {}

  public stop() {}
}
