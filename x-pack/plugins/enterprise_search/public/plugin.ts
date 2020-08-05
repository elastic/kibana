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
  FeatureCatalogueHomePageSection,
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
  home?: HomePublicPluginSetup;
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

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: 'enterpriseSearch',
        title: 'Enterprise Search',
        icon: 'logoEnterpriseSearch',
        description: 'Search everything',
        path: '/app/enterprise_search/app_search', // TODO: update this link to enterprise search landing page
        order: 100,
      });

      plugins.home.featureCatalogue.register({
        id: 'enterpriseSearch-overview',
        title: 'Enterprise Search overview',
        icon: 'logoEnterpriseSearch',
        description: 'Build a powerful search experience.',
        path: '/app/enterprise_search/app_search', // TODO: update this link to enterprise search landing page
        category: FeatureCatalogueCategory.DATA,
        homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
        solution: 'enterpriseSearch',
        order: 110,
      });

      plugins.home.featureCatalogue.register({
        id: 'appSearch',
        title: 'App Search',
        icon: AppSearchLogo,
        description: 'Connect your users to relevant data.',
        path: '/app/enterprise_search/app_search',
        category: FeatureCatalogueCategory.DATA,
        homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
        solution: 'enterpriseSearch',
        order: 120,
      });

      plugins.home.featureCatalogue.register({
        id: 'workplaceSearch',
        title: 'Workplace Search',
        icon: WorkplaceSearchLogo,
        description: 'Unify your team content.',
        path: '/app/enterprise_search/workplace_search',
        category: FeatureCatalogueCategory.DATA,
        homePageSection: FeatureCatalogueHomePageSection.SOLUTION_PANEL,
        solution: 'enterpriseSearch',
        order: 130,
      });
    }
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
