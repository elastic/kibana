/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Observable } from 'rxjs';
import { UiCounterMetricType } from '@kbn/analytics';
import { I18nProvider } from '@kbn/i18n-react';
import { ApplicationStart, CoreTheme } from 'kibana/public';
import { CoreStart, Plugin } from 'src/core/public';
import { KibanaThemeProvider } from '../../../../src/plugins/kibana_react/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { GlobalSearchPluginStart } from '../../global_search/public';
import { SavedObjectTaggingPluginStart } from '../../saved_objects_tagging/public';
import { SearchBar } from './components/search_bar';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  usageCollection?: UsageCollectionSetup;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}> {
  public setup() {
    return {};
  }

  public start(
    core: CoreStart,
    { globalSearch, savedObjectsTagging, usageCollection }: GlobalSearchBarPluginStartDeps
  ) {
    const trackUiMetric = usageCollection
      ? usageCollection.reportUiCounter.bind(usageCollection, 'global_search_bar')
      : (metricType: UiCounterMetricType, eventName: string | string[]) => {};

    core.chrome.navControls.registerCenter({
      order: 1000,
      mount: (container) =>
        this.mount({
          container,
          globalSearch,
          savedObjectsTagging,
          navigateToUrl: core.application.navigateToUrl,
          basePathUrl: core.http.basePath.prepend('/plugins/globalSearchBar/assets/'),
          darkMode: core.uiSettings.get('theme:darkMode'),
          theme$: core.theme.theme$,
          trackUiMetric,
        }),
    });
    return {};
  }

  private mount({
    container,
    globalSearch,
    savedObjectsTagging,
    navigateToUrl,
    basePathUrl,
    darkMode,
    theme$,
    trackUiMetric,
  }: {
    container: HTMLElement;
    globalSearch: GlobalSearchPluginStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    navigateToUrl: ApplicationStart['navigateToUrl'];
    basePathUrl: string;
    darkMode: boolean;
    theme$: Observable<CoreTheme>;
    trackUiMetric: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  }) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme$}>
        <I18nProvider>
          <SearchBar
            globalSearch={globalSearch}
            navigateToUrl={navigateToUrl}
            taggingApi={savedObjectsTagging}
            basePathUrl={basePathUrl}
            darkMode={darkMode}
            trackUiMetric={trackUiMetric}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      container
    );

    return () => ReactDOM.unmountComponentAtNode(container);
  }
}
