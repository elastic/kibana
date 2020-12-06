/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { BfetchPublicSetup } from '../../../../src/plugins/bfetch/public';

import { setAutocompleteService } from './services';
import { setupKqlQuerySuggestionProvider, KUERY_LANGUAGE_NAME } from './autocomplete';
import { EnhancedSearchInterceptor } from './search/search_interceptor';
<<<<<<< HEAD
import { BackgroundSessionService } from './background_session';
=======
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { createConnectedBackgroundSessionIndicator } from './search';
import { ConfigSchema } from '../config';
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146

export interface DataEnhancedSetupDependencies {
  bfetch: BfetchPublicSetup;
  data: DataPublicPluginSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export interface DataEnhancedStart {
  backgroundSession: BackgroundSessionService;
}

export class DataEnhancedPlugin
  implements Plugin<void, void, DataEnhancedSetupDependencies, DataEnhancedStartDependencies> {
<<<<<<< HEAD
  private backgroundSessionService!: BackgroundSessionService;
=======
  private enhancedSearchInterceptor!: EnhancedSearchInterceptor;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146

  public setup(
    core: CoreSetup<DataEnhancedStartDependencies>,
    { bfetch, data }: DataEnhancedSetupDependencies
  ) {
    data.autocomplete.addQuerySuggestionProvider(
      KUERY_LANGUAGE_NAME,
      setupKqlQuerySuggestionProvider(core)
    );

    this.enhancedSearchInterceptor = new EnhancedSearchInterceptor({
      bfetch,
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

  public start(core: CoreStart, plugins: DataEnhancedStartDependencies): DataEnhancedStart {
    setAutocompleteService(plugins.data.autocomplete);
<<<<<<< HEAD
    this.backgroundSessionService = new BackgroundSessionService(core.http, plugins.data.search);

    const enhancedSearchInterceptor = new EnhancedSearchInterceptor(
      this.backgroundSessionService,
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
      backgroundSession: this.backgroundSessionService,
    };
=======

    if (this.initializerContext.config.get().search.sendToBackground.enabled) {
      core.chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          React.createElement(
            createConnectedBackgroundSessionIndicator({
              sessionService: plugins.data.search.session,
              application: core.application,
              timeFilter: plugins.data.query.timefilter.timefilter,
            })
          )
        ),
      });
    }
  }

  public stop() {
    this.enhancedSearchInterceptor.stop();
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
  }
}
