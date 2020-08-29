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

import { IInitialAppData } from '../common/types';
import {
  ENTERPRISE_SEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';
import { ExternalUrl, IExternalUrl } from './applications/shared/enterprise_search_url';
import AppSearchLogo from './applications/app_search/assets/logo.svg';
import WorkplaceSearchLogo from './applications/workplace_search/assets/logo.svg';

export interface ClientConfigType {
  host?: string;
}
export interface ClientData extends IInitialAppData {
  externalUrl: IExternalUrl;
  errorConnecting?: boolean;
}

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private hasInitialized: boolean = false;
  private data: ClientData = {} as ClientData;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.data.externalUrl = new ExternalUrl(this.config.host || '');
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    core.application.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { chrome } = coreStart;
        chrome.docTitle.change(APP_SEARCH_PLUGIN.NAME);

        await this.getInitialData(coreStart.http);

        const { renderApp } = await import('./applications');
        const { AppSearch } = await import('./applications/app_search');

        return renderApp(AppSearch, params, coreStart, plugins, this.config, this.data);
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

        await this.getInitialData(coreStart.http);

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, params, coreStart, plugins, this.config, this.data);
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
        path: APP_SEARCH_PLUGIN.URL, // TODO: Change this to enterprise search overview page once available
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

  private async getInitialData(http: HttpSetup) {
    if (!this.config.host) return; // No API to call
    if (this.hasInitialized) return; // We've already made an initial call

    try {
      const { publicUrl, ...initialData } = await http.get('/api/enterprise_search/config_data');
      this.data = { ...this.data, ...initialData };
      if (publicUrl) this.data.externalUrl = new ExternalUrl(publicUrl);

      this.hasInitialized = true;
    } catch {
      this.data.errorConnecting = true;
      // The plugin will attempt to re-fetch config data on page change
    }
  }
}
