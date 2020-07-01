/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  ES_SEARCH_STRATEGY,
} from '../../../../src/plugins/data/public';
import { setAutocompleteService } from './services';
import { setupKqlQuerySuggestionProvider, KUERY_LANGUAGE_NAME } from './autocomplete';
import {
  ASYNC_SEARCH_STRATEGY,
  asyncSearchStrategyProvider,
  enhancedEsSearchStrategyProvider,
} from './search';
import { EnhancedSearchInterceptor } from './search/search_interceptor';
import { SessionService } from './session';

export interface DataEnhancedSetupDependencies {
  data: DataPublicPluginSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export interface DataEnhancedStart {
  sessionService: SessionService;
}

export class DataEnhancedPlugin
  implements Plugin<void, void, DataEnhancedSetupDependencies, DataEnhancedStartDependencies> {
  private sessionService!: SessionService;

  public setup(
    core: CoreSetup<DataEnhancedStartDependencies>,
    { data }: DataEnhancedSetupDependencies
  ) {
    data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );
    const asyncSearchStrategy = asyncSearchStrategyProvider(core);
    const esSearchStrategy = enhancedEsSearchStrategyProvider(core, asyncSearchStrategy);
    data.search.registerSearchStrategy(ASYNC_SEARCH_STRATEGY, asyncSearchStrategy);
    data.search.registerSearchStrategy(ES_SEARCH_STRATEGY, esSearchStrategy);
  }

  public start(core: CoreStart, plugins: DataEnhancedStartDependencies): DataEnhancedStart {
    setAutocompleteService(plugins.data.autocomplete);
    this.sessionService = new SessionService(core.http, plugins.data.search);

    const enhancedSearchInterceptor = new EnhancedSearchInterceptor(
      this.sessionService,
      plugins.data,
      core.notifications.toasts,
      core.application,
      core.injectedMetadata.getInjectedVar('esRequestTimeout') as number
    );
    plugins.data.search.setInterceptor(enhancedSearchInterceptor);

    /*
      Clear any open sessions upon navigation to make sure they are not used mistakenly by
      another application.
     */
    core.application.currentAppId$.subscribe(() => {
      plugins.data.search.session.clear();
    });

    return {
      sessionService: this.sessionService,
    };
  }
}
