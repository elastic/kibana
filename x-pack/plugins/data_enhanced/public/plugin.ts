/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { setAutocompleteService } from './services';
import { setupKqlQuerySuggestionProvider, KUERY_LANGUAGE_NAME } from './autocomplete';

import { EnhancedSearchInterceptor } from './search/search_interceptor';

export interface DataEnhancedSetupDependencies {
  data: DataPublicPluginSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export type DataEnhancedStart = ReturnType<DataEnhancedPlugin['start']>;

export class DataEnhancedPlugin
  implements Plugin<void, void, DataEnhancedSetupDependencies, DataEnhancedStartDependencies> {
  private enhancedSearchInterceptor!: EnhancedSearchInterceptor;

  public setup(
    core: CoreSetup<DataEnhancedStartDependencies>,
    { data }: DataEnhancedSetupDependencies
  ) {
    data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );

    this.enhancedSearchInterceptor = new EnhancedSearchInterceptor({
      toasts: core.notifications.toasts,
      http: core.http,
      uiSettings: core.uiSettings,
      startServices: core.getStartServices(),
      usageCollector: data.search.usageCollector,
      session: data.search.session,
    });

    data.__enhance({
      search: {
        searchInterceptor: this.enhancedSearchInterceptor,
      },
    });
  }

  public start(core: CoreStart, plugins: DataEnhancedStartDependencies) {
    setAutocompleteService(plugins.data.autocomplete);
  }

  public stop() {
    this.enhancedSearchInterceptor.stop();
  }
}
