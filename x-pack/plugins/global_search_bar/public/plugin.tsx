/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { I18nProvider } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, Plugin } from 'src/core/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { GlobalSearchPluginStart } from '../../global_search/public';
import { SearchBar } from '../public/components/search_bar';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
  usageCollection: UsageCollectionSetup;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}> {
  public async setup() {
    return {};
  }

  public start(core: CoreStart, { globalSearch, usageCollection }: GlobalSearchBarPluginStartDeps) {
    let trackUiMetric = (metricType: UiCounterMetricType, eventName: string | string[]) => {};

    if (usageCollection) {
      trackUiMetric = usageCollection.reportUiCounter.bind(usageCollection, 'global_search_bar');
    }

    core.chrome.navControls.registerCenter({
      order: 1000,
      mount: (target) =>
        this.mount(
          target,
          globalSearch,
          core.application.navigateToUrl,
          core.http.basePath.prepend('/plugins/globalSearchBar/assets/'),
          core.uiSettings.get('theme:darkMode'),
          trackUiMetric
        ),
    });
    return {};
  }

  private mount(
    targetDomElement: HTMLElement,
    globalSearch: GlobalSearchPluginStart,
    navigateToUrl: ApplicationStart['navigateToUrl'],
    basePathUrl: string,
    darkMode: boolean,
    trackUiMetric: (metricType: UiCounterMetricType, eventName: string | string[]) => void
  ) {
    ReactDOM.render(
      <I18nProvider>
        <SearchBar
          globalSearch={globalSearch.find}
          navigateToUrl={navigateToUrl}
          basePathUrl={basePathUrl}
          darkMode={darkMode}
          trackUiMetric={trackUiMetric}
        />
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
