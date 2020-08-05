/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  AppMountParameters,
  HttpSetup,
} from 'src/core/public';

import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { LicensingPluginSetup } from '../../licensing/public';

import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../common/constants';
import { getPublicUrl } from './applications/shared/enterprise_search_url';
import AppSearchLogo from './applications/app_search/assets/logo.svg';
import WorkplaceSearchLogo from './applications/workplace_search/assets/logo.svg';

export interface ClientConfigType {
  host?: string;
}
export interface PluginsSetup {
  home: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private hasCheckedPublicUrl: boolean = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = { host: this.config.host };

    core.application.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();

        await this.setPublicUrl(config, coreStart.http);

        const { renderApp } = await import('./applications');
        const { AppSearch } = await import('./applications/app_search');

        return renderApp(AppSearch, coreStart, params, config, plugins);
      },
    });

    core.application.register({
      id: WORKPLACE_SEARCH_PLUGIN.ID,
      title: WORKPLACE_SEARCH_PLUGIN.NAME,
      appRoute: WORKPLACE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, coreStart, params, config, plugins);
      },
    });

    plugins.home.featureCatalogue.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      icon: AppSearchLogo,
      description: APP_SEARCH_PLUGIN.DESCRIPTION,
      path: APP_SEARCH_PLUGIN.URL,
      category: FeatureCatalogueCategory.DATA,
      showOnHomePage: true,
    });

    plugins.home.featureCatalogue.register({
      id: WORKPLACE_SEARCH_PLUGIN.ID,
      title: WORKPLACE_SEARCH_PLUGIN.NAME,
      icon: WorkplaceSearchLogo,
      description: WORKPLACE_SEARCH_PLUGIN.DESCRIPTION,
      path: WORKPLACE_SEARCH_PLUGIN.URL,
      category: FeatureCatalogueCategory.DATA,
      showOnHomePage: true,
    });
  }

  public start(core: CoreStart) {}

  public stop() {}

  private async setPublicUrl(config: ClientConfigType, http: HttpSetup) {
    if (!config.host) return; // No API to check
    if (this.hasCheckedPublicUrl) return; // We've already performed the check

    const publicUrl = await getPublicUrl(http);
    if (publicUrl) config.host = publicUrl;
    this.hasCheckedPublicUrl = true;
  }
}
