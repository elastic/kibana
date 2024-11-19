/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChromeNavControl,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { SearchBar } from './components/search_bar';
import type { GlobalSearchBarConfigType } from './types';
import { EventReporter, eventTypes } from './telemetry';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  usageCollection?: UsageCollectionSetup;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}, {}, GlobalSearchBarPluginStartDeps> {
  private config: GlobalSearchBarConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<GlobalSearchBarConfigType>();
  }

  public setup({ analytics }: CoreSetup) {
    eventTypes.forEach((eventType) => {
      analytics.registerEventType(eventType);
    });

    return {};
  }

  public start(core: CoreStart, startDeps: GlobalSearchBarPluginStartDeps) {
    core.chrome.navControls.registerCenter(this.getNavControl({ core, ...startDeps }));
    return {};
  }

  private getNavControl(deps: { core: CoreStart } & GlobalSearchBarPluginStartDeps) {
    const { core, globalSearch, savedObjectsTagging, usageCollection } = deps;
    const { application, http, theme, i18n } = core;
    const reportEvent = new EventReporter({ analytics: core.analytics, usageCollection });

    const navControl: ChromeNavControl = {
      order: 1000,
      mount: (container) => {
        ReactDOM.render(
          <KibanaRenderContextProvider theme={theme} i18n={i18n}>
            <SearchBar
              globalSearch={{ ...globalSearch, searchCharLimit: this.config.input_max_limit }}
              navigateToUrl={application.navigateToUrl}
              taggingApi={savedObjectsTagging}
              basePathUrl={http.basePath.prepend('/plugins/globalSearchBar/assets/')}
              chromeStyle$={core.chrome.getChromeStyle$()}
              reportEvent={reportEvent}
            />
          </KibanaRenderContextProvider>,
          container
        );

        return () => ReactDOM.unmountComponentAtNode(container);
      },
    };
    return navControl;
  }
}
