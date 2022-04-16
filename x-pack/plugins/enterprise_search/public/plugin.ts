/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import {
  AppMountParameters,
  CoreStart,
  CoreSetup,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';

import {
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';
import { InitialAppData } from '../common/types';

import { docLinks } from './applications/shared/doc_links';

export interface ClientConfigType {
  host?: string;
}
export interface ClientData extends InitialAppData {
  publicUrl?: string;
  errorConnectingMessage?: string;
}

interface PluginsSetup {
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
  security: SecurityPluginSetup;
}
export interface PluginsStart {
  cloud?: CloudSetup & CloudStart;
  licensing: LicensingPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  security: SecurityPluginStart;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private hasInitialized: boolean = false;
  private data: ClientData = {} as ClientData;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const { cloud } = plugins;

    core.application.register({
      id: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      title: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAV_TITLE,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      appRoute: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchOverview } = await import(
          './applications/enterprise_search_overview'
        );

        return renderApp(EnterpriseSearchOverview, kibanaDeps, pluginData);
      },
    });

    core.application.register({
      id: ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      title: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAV_TITLE,
      euiIconType: ENTERPRISE_SEARCH_CONTENT_PLUGIN.LOGO,
      appRoute: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchContent } = await import(
          './applications/enterprise_search_content'
        );

        return renderApp(EnterpriseSearchContent, kibanaDeps, pluginData);
      },
    });

    core.application.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
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
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      appRoute: WORKPLACE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(WORKPLACE_SEARCH_PLUGIN.NAME);

        // The Workplace Search Personal dashboard needs the chrome hidden. We hide it globally
        // here first to prevent a flash of chrome on the Personal dashboard and unhide it for admin routes.
        if (this.config.host) chrome.setIsVisible(false);
        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, kibanaDeps, pluginData);
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
        title: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAME,
        icon: 'logoEnterpriseSearch',
        description: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.DESCRIPTION,
        path: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
        order: 100,
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

  public start(core: CoreStart) {
    // This must be called here in start() and not in `applications/index.tsx` to prevent loading
    // race conditions with our apps' `routes.ts` being initialized before `renderApp()`
    docLinks.setDocLinks(core.docLinks);
  }

  public stop() {}

  private async getKibanaDeps(
    core: CoreSetup,
    params: AppMountParameters,
    cloudSetup?: CloudSetup
  ) {
    // Helper for using start dependencies on mount (instead of setup dependencies)
    // and for grouping Kibana-related args together (vs. plugin-specific args)
    const [coreStart, pluginsStart] = await core.getStartServices();
    const cloud =
      cloudSetup && (pluginsStart as PluginsStart).cloud
        ? { ...cloudSetup, ...(pluginsStart as PluginsStart).cloud }
        : undefined;
    const plugins = { ...pluginsStart, cloud } as PluginsStart;

    return { params, core: coreStart, plugins };
  }

  private getPluginData() {
    // Small helper for grouping plugin data related args together
    return { config: this.config, data: this.data };
  }

  private async getInitialData(http: HttpSetup) {
    if (!this.config.host) return; // No API to call
    if (this.hasInitialized) return; // We've already made an initial call

    try {
      this.data = await http.get('/internal/enterprise_search/config_data');
      this.hasInitialized = true;
    } catch (e) {
      this.data.errorConnectingMessage = `${e.res.status} ${e.message}`;
    }
  }
}
