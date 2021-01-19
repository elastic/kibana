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
import {
  initAngularBootstrap,
  KibanaLegacyStart,
} from '../../../../src/plugins/kibana_legacy/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

import { toggleNavLink } from './services/toggle_nav_link';
import { LicensingPluginStart } from '../../licensing/public';
import { checkLicense } from '../common/check_license';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '../../../../src/plugins/home/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { ConfigSchema } from '../config';
import { SavedObjectsStart } from '../../../../src/plugins/saved_objects/public';

export interface GraphPluginSetupDependencies {
  home?: HomePublicPluginSetup;
}

export interface GraphPluginStartDependencies {
  navigation: NavigationStart;
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
  savedObjects: SavedObjectsStart;
  kibanaLegacy: KibanaLegacyStart;
  home?: HomePublicPluginStart;
}

export class GraphPlugin
  implements Plugin<void, void, GraphPluginSetupDependencies, GraphPluginStartDependencies> {
  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  setup(core: CoreSetup<GraphPluginStartDependencies>, { home }: GraphPluginSetupDependencies) {
    if (home) {
      home.featureCatalogue.register({
        id: 'graph',
        title: 'Graph',
        subtitle: i18n.translate('xpack.graph.pluginSubtitle', {
          defaultMessage: 'Reveal patterns and relationships.',
        }),
        description: i18n.translate('xpack.graph.pluginDescription', {
          defaultMessage: 'Surface and analyze relevant relationships in your Elasticsearch data.',
        }),
        icon: 'graphApp',
        path: '/app/graph',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.DATA,
        solutionId: 'kibana',
        order: 600,
      });
    }

    const config = this.initializerContext.config.get();

    initAngularBootstrap();
    core.application.register({
      id: 'graph',
      title: 'Graph',
      order: 6000,
      appRoute: '/app/graph',
      euiIconType: 'logoKibana',
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change(
          i18n.translate('xpack.graph.pageTitle', { defaultMessage: 'Graph' })
        );
        const { renderApp } = await import('./application');
        return renderApp({
          ...params,
          pluginInitializerContext: this.initializerContext,
          licensing: pluginsStart.licensing,
          core: coreStart,
          coreStart,
          navigation: pluginsStart.navigation,
          data: pluginsStart.data,
          kibanaLegacy: pluginsStart.kibanaLegacy,
          savedObjectsClient: coreStart.savedObjects.client,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          canEditDrillDownUrls: config.canEditDrillDownUrls,
          graphSavePolicy: config.savePolicy,
          storage: new Storage(window.localStorage),
          capabilities: coreStart.application.capabilities.graph,
          chrome: coreStart.chrome,
          toastNotifications: coreStart.notifications.toasts,
          indexPatterns: pluginsStart.data!.indexPatterns,
          overlays: coreStart.overlays,
          savedObjects: pluginsStart.savedObjects,
        });
      },
    });
  }

  start(core: CoreStart, { home, licensing }: GraphPluginStartDependencies) {
    licensing.license$.subscribe((license) => {
      const licenseInformation = checkLicense(license);
      toggleNavLink(licenseInformation, core.chrome.navLinks);
      if (home && !licenseInformation.enableAppLink) {
        home.featureCatalogue.removeFeature('graph');
      }
    });
  }

  stop() {}
}
