/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import {
  AppStatus,
  AppUpdater,
  CoreSetup,
  CoreStart,
  AppMountParameters,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';

import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { checkLicense } from '../common/check_license';
import { ConfigSchema } from '../config';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';

export interface GraphPluginSetupDependencies {
  home?: HomePublicPluginSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface GraphPluginStartDependencies {
  navigation: NavigationStart;
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  inspector: InspectorPublicPluginStart;
  home?: HomePublicPluginStart;
  spaces?: SpacesApi;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  contentManagement: ContentManagementPublicStart;
}

export class GraphPlugin
  implements Plugin<void, void, GraphPluginSetupDependencies, GraphPluginStartDependencies>
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  setup(
    core: CoreSetup<GraphPluginStartDependencies>,
    { home, contentManagement }: GraphPluginSetupDependencies
  ) {
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
        category: 'data',
        solutionId: 'kibana',
        order: 600,
      });
    }

    const config = this.initializerContext.config.get();

    contentManagement.registry.register({
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
      },
      name: i18n.translate('xpack.graph.content.name', {
        defaultMessage: 'Graph Visualization',
      }),
    });

    core.application.register({
      id: 'graph',
      title: 'Graph',
      order: 6000,
      appRoute: '/app/graph',
      euiIconType: 'logoKibana',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appUpdater$,
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
          unifiedSearch: pluginsStart.unifiedSearch,
          contentClient: pluginsStart.contentManagement.client,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          canEditDrillDownUrls: config.canEditDrillDownUrls,
          graphSavePolicy: config.savePolicy,
          storage: new Storage(window.localStorage),
          capabilities: coreStart.application.capabilities,
          chrome: coreStart.chrome,
          toastNotifications: coreStart.notifications.toasts,
          indexPatterns: pluginsStart.data!.indexPatterns,
          overlays: coreStart.overlays,
          uiSettings: core.uiSettings,
          spaces: pluginsStart.spaces,
          inspect: pluginsStart.inspector,
          savedObjectsManagement: pluginsStart.savedObjectsManagement,
          contentManagement: pluginsStart.contentManagement,
        });
      },
    });
  }

  start(core: CoreStart, { home, licensing }: GraphPluginStartDependencies) {
    licensing.license$.subscribe((license) => {
      const licenseInformation = checkLicense(license);

      this.appUpdater$.next(() => ({
        status: licenseInformation.showAppLink
          ? licenseInformation.enableAppLink
            ? AppStatus.accessible
            : AppStatus.inaccessible
          : AppStatus.inaccessible,
        tooltip: licenseInformation.showAppLink ? licenseInformation.message : undefined,
      }));

      if (home && !licenseInformation.enableAppLink) {
        home.featureCatalogue.removeFeature('graph');
      }
    });
  }

  stop() {}
}
