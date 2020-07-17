/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import ReactDOM from 'react-dom';
import { SearchBar } from '../public/components/search_bar';
import { GlobalSearchPluginSetup } from '../../global_search/public';

export interface GlobalSearchBarPluginSetupDeps {
  globalSearch: GlobalSearchPluginSetup;
}

export class GlobalSearchProvidersPlugin
  implements Plugin<{}, {}, GlobalSearchBarPluginSetupDeps, {}> {
  private search: GlobalSearchPluginSetup | undefined = undefined;

  public setup(coreSetup: CoreSetup<{}, {}>, { globalSearch }: GlobalSearchBarPluginSetupDeps) {
    this.search = globalSearch;
    return {};
  }

  public start(core: CoreStart) {
    core.chrome.navControls.registerCenter({
      order: 1000,
      mount: (target) => this.mount(target),
    });
    return {};
  }

  private mount(targetDomElement: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <SearchBar search={this.search} />
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
