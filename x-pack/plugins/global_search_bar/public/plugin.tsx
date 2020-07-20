/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, Plugin } from 'src/core/public';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import ReactDOM from 'react-dom';
import { SearchBar } from '../public/components/search_bar';
import { GlobalSearchPluginSetup } from '../../global_search/public';

export interface GlobalSearchBarPluginStartDeps {
  globalSearch: GlobalSearchPluginStart;
}

export class GlobalSearchProvidersPlugin
  implements Plugin<{}, {}, GlobalSearchBarPluginSetupDeps, {}> {
  private search: GlobalSearchPluginSetup | undefined = undefined;

  public async setup() {
    return {};
  }

  public start(core: CoreStart, { globalSearch }: GlobalSearchBarPluginStartDeps) {
    core.chrome.navControls.registerCenter({
      order: 1000,
      mount: (target) => this.mount(target, globalSearch),
    });
    return {};
  }

  private mount(targetDomElement: HTMLElement, globalSearch: GlobalSearchPluginStart) {
    ReactDOM.render(
      <I18nProvider>
        <SearchBar globalSearch={globalSearch} />
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
