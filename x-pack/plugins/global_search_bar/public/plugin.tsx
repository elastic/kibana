/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeNavControl, CoreStart, Plugin } from '@kbn/core/public';
import { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { SearchBar } from './components/search_bar';
import { TrackUiMetricFn } from './types';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  usageCollection?: UsageCollectionSetup;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}> {
  public setup() {
    return {};
  }

  public start(core: CoreStart, startDeps: GlobalSearchBarPluginStartDeps) {
    core.chrome.navControls.registerCenter(this.getNavControl({ core, ...startDeps }));
    return {};
  }

  private getNavControl(deps: { core: CoreStart } & GlobalSearchBarPluginStartDeps) {
    const { core, globalSearch, savedObjectsTagging, usageCollection } = deps;
    const { application, http, theme, uiSettings } = core;

    let trackUiMetric: TrackUiMetricFn = () => {};
    if (usageCollection) {
      trackUiMetric = (...args) => {
        // track UI Counter metrics
        usageCollection.reportUiCounter('global_search_bar', ...args);

        // TODO track EBT metrics using core.analytics
      };
    }

    const navControl: ChromeNavControl = {
      order: 1000,
      mount: (container) => {
        ReactDOM.render(
          <KibanaThemeProvider theme$={theme.theme$}>
            <I18nProvider>
              <SearchBar
                globalSearch={globalSearch}
                navigateToUrl={application.navigateToUrl}
                taggingApi={savedObjectsTagging}
                basePathUrl={http.basePath.prepend('/plugins/globalSearchBar/assets/')}
                darkMode={uiSettings.get('theme:darkMode')}
                chromeStyle$={core.chrome.getChromeStyle$()}
                trackUiMetric={trackUiMetric}
              />
            </I18nProvider>
          </KibanaThemeProvider>,
          container
        );

        return () => ReactDOM.unmountComponentAtNode(container);
      },
    };
    return navControl;
  }
}
