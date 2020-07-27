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
      id: 'appSearch',
      title: 'App Search',
      appRoute: '/app/enterprise_search/app_search',
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
      id: 'workplaceSearch',
      title: 'Workplace Search',
      appRoute: '/app/enterprise_search/workplace_search',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, coreStart, params, config, plugins);
      },
    });

    plugins.home.featureCatalogue.register({
      id: 'appSearch',
      title: 'App Search',
      icon: AppSearchLogo,
      description:
        'Leverage dashboards, analytics, and APIs for advanced application search made simple.',
      path: '/app/enterprise_search/app_search',
      category: FeatureCatalogueCategory.DATA,
      showOnHomePage: true,
    });

    plugins.home.featureCatalogue.register({
      id: 'workplaceSearch',
      title: 'Workplace Search',
      icon: WorkplaceSearchLogo,
      description:
        'Search all documents, files, and sources available across your virtual workplace.',
      path: '/app/enterprise_search/workplace_search',
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
