/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, Plugin } from 'src/core/public';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import ReactDOM from 'react-dom';
import { ApplicationStart } from 'kibana/public';
import { SearchBar } from '../public/components/search_bar';
import { GlobalSearchPluginStart } from '../../global_search/public';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
}

export class GlobalSearchBarPlugin implements Plugin<{}, {}> {
  public async setup() {
    return {};
  }

  public start(core: CoreStart, { globalSearch }: GlobalSearchBarPluginStartDeps) {
    core.chrome.navControls.registerCenter({
      order: 1000,
      mount: (target) => this.mount(target, globalSearch, core.application.navigateToUrl),
    });
    return {};
  }

  private mount(
    targetDomElement: HTMLElement,
    globalSearch: GlobalSearchPluginStart,
    navigateToUrl: ApplicationStart['navigateToUrl']
  ) {
    ReactDOM.render(
      <I18nProvider>
        <SearchBar globalSearch={globalSearch.find} navigateToUrl={navigateToUrl} />
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
