/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { UiCounterMetricType } from '@kbn/analytics';
import { I18nProvider } from '@kbn/i18n-react';
import { ApplicationStart } from '@kbn/core/public';
import { CoreStart, Plugin } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
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
    trackUiMetric,
  }: {
    container: HTMLElement;
    globalSearch: GlobalSearchPluginStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    navigateToUrl: ApplicationStart['navigateToUrl'];
    basePathUrl: string;
    darkMode: boolean;
    trackUiMetric: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  }) {
    ReactDOM.render(
      <I18nProvider>
        <SearchBar
          globalSearch={globalSearch}
          navigateToUrl={navigateToUrl}
          taggingApi={savedObjectsTagging}
          basePathUrl={basePathUrl}
          darkMode={darkMode}
          trackUiMetric={trackUiMetric}
        />
      </I18nProvider>,
      container
    );

    return () => ReactDOM.unmountComponentAtNode(container);
  }
}
