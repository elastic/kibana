/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import type { ManagementAppMountParams } from 'src/plugins/management/public';
import type {
  AppDependencies,
  IManagementSectionsPluginsSetup,
  IManagementSectionsPluginsStart,
  SessionsConfigSchema,
} from '../';
import { APP } from '../';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { renderApp } from './render';

export class SearchSessionsMgmtApp {
  constructor(
    private coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
    private config: SessionsConfigSchema,
    private kibanaVersion: string,
    private params: ManagementAppMountParams,
    private pluginsSetup: IManagementSectionsPluginsSetup
  ) {}

  public async mountManagementSection() {
    const { coreSetup, params, pluginsSetup } = this;
    const [coreStart, pluginsStart] = await coreSetup.getStartServices();

    const {
      chrome: { docTitle },
      http,
      docLinks,
      i18n,
      notifications,
      uiSettings,
      application,
    } = coreStart;
    const { data, share } = pluginsStart;

    const pluginName = APP.getI18nName();
    docTitle.change(pluginName);
    params.setBreadcrumbs([{ text: pluginName }]);

    const { sessionsClient } = data.search;
    const api = new SearchSessionsMgmtAPI(sessionsClient, this.config, {
      notifications,
      locators: share.url.locators,
      application,
      usageCollector: pluginsSetup.data.search.usageCollector,
    });

    const documentation = new AsyncSearchIntroDocumentation(docLinks);

    const dependencies: AppDependencies = {
      plugins: pluginsSetup,
      config: this.config,
      documentation,
      core: coreStart,
      api,
      http,
      i18n,
      uiSettings,
      share,
      kibanaVersion: this.kibanaVersion,
    };

    const { element } = params;
    const unmountAppCb = renderApp(element, dependencies);

    return () => {
      docTitle.reset();
      unmountAppCb();
    };
  }
}

export { renderApp };
