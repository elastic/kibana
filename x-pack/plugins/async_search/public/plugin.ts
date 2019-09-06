/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  CoreSetup,
} from '../../../../src/core/public';
import { ISearchSetup, ISearchAppMountContext } from '../../../../src/plugins/search/public';
import { asyncSearchStrategyProvider } from './async_search_strategy';

interface AsyncSearchSetupDependencies {
  search: ISearchSetup;
}

declare module 'kibana/public' {
  interface AppMountContext {
    search: ISearchAppMountContext;
  }
}

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

export class AsyncSearchPublicPlugin implements Plugin<void, void, AsyncSearchSetupDependencies> {
  constructor(private initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup, deps: AsyncSearchSetupDependencies) {
    deps.search.registerClientSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ASYNC_SEARCH_STRATEGY,
      asyncSearchStrategyProvider
    );
  }

  public start(core: CoreStart) {}
  public stop() {}
}
