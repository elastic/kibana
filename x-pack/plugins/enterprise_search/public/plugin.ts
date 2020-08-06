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
import { i18n } from '@kbn/i18n';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { LicensingPluginSetup } from '../../licensing/public';

import {
  ENTERPRISE_SEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';
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
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { chrome } = coreStart;
        chrome.docTitle.change(APP_SEARCH_PLUGIN.NAME);

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
        const { chrome } = coreStart;
        chrome.docTitle.change(WORKPLACE_SEARCH_PLUGIN.NAME);

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, coreStart, params, config, plugins);
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: ENTERPRISE_SEARCH_PLUGIN.ID,
        title: ENTERPRISE_SEARCH_PLUGIN.NAME,
        subtitle: i18n.translate('xpack.enterpriseSearch.featureCatalogue.subtitle', {
          defaultMessage: 'Search everything',
        }),
        icon: 'logoEnterpriseSearch',
        descriptions: [
          i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription1', {
            defaultMessage: 'Build a powerful search experience.',
          }),
          i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription2', {
            defaultMessage: 'Connect your users to relevant data.',
          }),
          i18n.translate('xpack.enterpriseSearch.featureCatalogueDescription3', {
            defaultMessage: 'Unify your team content.',
          }),
        ],
        path: ENTERPRISE_SEARCH_PLUGIN.URL,
      });

      plugins.home.featureCatalogue.register({
        id: APP_SEARCH_PLUGIN.ID,
        title: APP_SEARCH_PLUGIN.NAME,
        icon: AppSearchLogo,
        description: APP_SEARCH_PLUGIN.DESCRIPTION,
        path: APP_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
      });

      plugins.home.featureCatalogue.register({
        id: WORKPLACE_SEARCH_PLUGIN.ID,
        title: WORKPLACE_SEARCH_PLUGIN.NAME,
        icon: WorkplaceSearchLogo,
        description: WORKPLACE_SEARCH_PLUGIN.DESCRIPTION,
        path: WORKPLACE_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
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
