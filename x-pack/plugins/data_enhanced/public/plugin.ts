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
import { SessionService } from './session';

export interface DataEnhancedSetupDependencies {
  data: DataPublicPluginSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export interface DataEnhancedStart {
  search: {
    session: SessionService;
  };
}

export class DataEnhancedPlugin
  implements
    Plugin<void, DataEnhancedStart, DataEnhancedSetupDependencies, DataEnhancedStartDependencies> {
  private sessionService!: SessionService;

  public setup(
    core: CoreSetup<DataEnhancedStartDependencies>,
    { data }: DataEnhancedSetupDependencies
  ) {
    data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );
  }

  public start(core: CoreStart, plugins: DataEnhancedStartDependencies): DataEnhancedStart {
    setAutocompleteService(plugins.data.autocomplete);
    this.sessionService = new SessionService(core.http, plugins.data.search);

    const enhancedSearchInterceptor = new EnhancedSearchInterceptor(
      {
        session: this.sessionService,
        toasts: core.notifications.toasts,
        application: core.application,
        http: core.http,
        uiSettings: core.uiSettings,
      },
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
      search: {
        session: this.sessionService,
      },
    };
  }
}
