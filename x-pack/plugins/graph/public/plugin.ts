/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart } from 'kibana/public';
import { AppMountParameters, Plugin } from 'src/core/public';
import { PluginInitializerContext } from 'kibana/public';

import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { initAngularBootstrap } from '../../../../src/plugins/kibana_legacy/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

import { toggleNavLink } from './services/toggle_nav_link';
import { LicensingPluginSetup } from '../../licensing/public';
import { checkLicense } from '../common/check_license';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import { ConfigSchema } from '../config';

// import './index.scss';

export interface GraphPluginSetupDependencies {
  graph: GraphSetup;
  licensing: LicensingPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface GraphPluginStartDependencies {
  navigation: NavigationStart;
  data: DataPublicPluginStart;
}

export class GraphPlugin
  implements Plugin<{ config: Readonly<ConfigSchema> }, void, {}, GraphPluginStartDependencies> {
  private licensing: LicensingPluginSetup | null = null;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  setup(
    core: CoreSetup<GraphPluginStartDependencies>,
    { licensing, home }: GraphPluginSetupDependencies
  ) {
    this.licensing = licensing;

    if (home) {
      home.featureCatalogue.register({
        id: 'graph',
        title: 'Graph',
        description: i18n.translate('xpack.graph.pluginDescription', {
          defaultMessage: 'Surface and analyze relevant relationships in your Elasticsearch data.',
        }),
        icon: 'graphApp',
        path: '/app/graph',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }

    const config = this.initializerContext.config.get();

    initAngularBootstrap();
    core.application.register({
      id: 'graph',
      title: 'Graph',
      order: 9000,
      appRoute: '/app/graph',
      icon: 'plugins/graph/icon.png',
      euiIconType: 'graphApp',
      category: DEFAULT_APP_CATEGORIES.analyze,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({
          ...params,
          pluginInitializerContext: this.initializerContext,
          licensing,
          core: coreStart,
          navigation: pluginsStart.navigation,
          npData: pluginsStart.data,
          savedObjectsClient: coreStart.savedObjects.client,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          canEditDrillDownUrls: config.canEditDrillDownUrls,
          graphSavePolicy: config.savePolicy,
          storage: new Storage(window.localStorage),
          capabilities: coreStart.application.capabilities.graph,
          coreStart,
          chrome: coreStart.chrome,
          config: coreStart.uiSettings,
          toastNotifications: coreStart.notifications.toasts,
          indexPatterns: pluginsStart.data!.indexPatterns,
          overlays: coreStart.overlays,
        });
      },
    });

    return {
      /**
       * The configuration is temporarily exposed to allow the legacy graph plugin to consume
       * the setting. Once the graph plugin is migrated completely, this will become an implementation
       * detail.
       * @deprecated
       */
      config,
    };
  }

  start(core: CoreStart) {
    if (this.licensing === null) {
      throw new Error('Start called before setup');
    }
    this.licensing.license$.subscribe(license => {
      toggleNavLink(checkLicense(license), core.chrome.navLinks);
    });
  }

  stop() {}
}

export type GraphSetup = ReturnType<GraphPlugin['setup']>;
