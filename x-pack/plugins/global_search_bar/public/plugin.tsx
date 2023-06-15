/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeNavControl, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { SearchBar } from './components/search_bar';
import { getTracking } from './lib/tracking';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  usageCollection?: UsageCollectionSetup;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}> {
  public setup({ analytics }: CoreSetup) {
    analytics.registerEventType({
      eventType: 'global_search_bar_blur',
      schema: {
        focus_time_ms: {
          type: 'long',
          _meta: {
            description:
              'The length in milliseconds the user viewed the global search bar before closing without navigating',
          },
        },
      },
    });

    return {};
  }

  public start(core: CoreStart, startDeps: GlobalSearchBarPluginStartDeps) {
    core.chrome.navControls.registerCenter(this.getNavControl({ core, ...startDeps }));
    return {};
  }

  private getNavControl(deps: { core: CoreStart } & GlobalSearchBarPluginStartDeps) {
    const { core, globalSearch, savedObjectsTagging, usageCollection } = deps;
    const { application, http, theme, uiSettings } = core;

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
                trackUiMetric={getTracking({ analytics: core.analytics, usageCollection })}
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
