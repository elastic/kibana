/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppMountParameters,
  CoreSetup,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { LicensingPluginStart } from '../../licensing/public';
import {
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';
import { IInitialAppData } from '../common/types';

export interface ClientConfigType {
  host?: string;
}
export interface ClientData extends IInitialAppData {
  publicUrl?: string;
  errorConnecting?: boolean;
}

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
}
export interface PluginsStart {
  licensing: LicensingPluginStart;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private hasInitialized: boolean = false;
  private data: ClientData = {} as ClientData;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    core.application.register({
      id: ENTERPRISE_SEARCH_PLUGIN.ID,
      title: ENTERPRISE_SEARCH_PLUGIN.NAV_TITLE,
      euiIconType: ENTERPRISE_SEARCH_PLUGIN.LOGO,
      appRoute: ENTERPRISE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearch } = await import('./applications/enterprise_search');

        return renderApp(EnterpriseSearch, kibanaDeps, pluginData);
      },
    });

    core.application.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      euiIconType: ENTERPRISE_SEARCH_PLUGIN.LOGO,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(APP_SEARCH_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { AppSearch } = await import('./applications/app_search');

        return renderApp(AppSearch, kibanaDeps, pluginData);
      },
    });

    core.application.register({
      id: WORKPLACE_SEARCH_PLUGIN.ID,
      title: WORKPLACE_SEARCH_PLUGIN.NAME,
      euiIconType: ENTERPRISE_SEARCH_PLUGIN.LOGO,
      appRoute: WORKPLACE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(WORKPLACE_SEARCH_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, kibanaDeps, pluginData);
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: ENTERPRISE_SEARCH_PLUGIN.ID,
        title: ENTERPRISE_SEARCH_PLUGIN.NAME,
        subtitle: ENTERPRISE_SEARCH_PLUGIN.SUBTITLE,
        icon: 'logoEnterpriseSearch',
        description: ENTERPRISE_SEARCH_PLUGIN.DESCRIPTION,
        appDescriptions: ENTERPRISE_SEARCH_PLUGIN.APP_DESCRIPTIONS,
        path: ENTERPRISE_SEARCH_PLUGIN.URL,
      });

      plugins.home.featureCatalogue.register({
        id: APP_SEARCH_PLUGIN.ID,
        title: APP_SEARCH_PLUGIN.NAME,
        icon: 'appSearchApp',
        description: APP_SEARCH_PLUGIN.DESCRIPTION,
        path: APP_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
      });

      plugins.home.featureCatalogue.register({
        id: WORKPLACE_SEARCH_PLUGIN.ID,
        title: WORKPLACE_SEARCH_PLUGIN.NAME,
        icon: 'workplaceSearchApp',
        description: WORKPLACE_SEARCH_PLUGIN.DESCRIPTION,
        path: WORKPLACE_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
      });
    }
  }

  public start() {}

  public stop() {}

  private async getKibanaDeps(core: CoreSetup, params: AppMountParameters) {
    // Helper for using start dependencies on mount (instead of setup dependencies)
    // and for grouping Kibana-related args together (vs. plugin-specific args)
    const [coreStart, pluginsStart] = await core.getStartServices();
    return { params, core: coreStart, plugins: pluginsStart as PluginsStart };
  }

  private getPluginData() {
    // Small helper for grouping plugin data related args together
    return { config: this.config, data: this.data };
  }

  private async getInitialData(http: HttpSetup) {
    if (!this.config.host) return; // No API to call
    if (this.hasInitialized) return; // We've already made an initial call

    try {
      this.data = await http.get('/api/enterprise_search/config_data');
      this.hasInitialized = true;
    } catch {
      this.data.errorConnecting = true;
    }
  }
}
