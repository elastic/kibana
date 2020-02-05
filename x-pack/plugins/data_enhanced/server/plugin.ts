/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { DataPluginSetup } from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider } from '../server/search/es_search';
import { ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';

interface SetupDependencies {
  data: DataPluginSetup;
}

export class EnhancedDataServerPlugin implements Plugin<DataPluginSetup> {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, deps: SetupDependencies) {
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider
    );
  }

  public start(core: CoreStart) {}

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
