/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';

import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

import { AppStatus, type AppUpdater, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

import type { MapsStartApi, MapsSetupApi } from '@kbn/maps-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { DataVisualizerPluginStart } from '@kbn/data-visualizer-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DashboardSetup, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CasesUiSetup, CasesUiStart } from '@kbn/cases-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { registerManagementSection } from './application/management';
import { MlLocatorDefinition, type MlLocator } from './locator';
import { setDependencyCache } from './application/util/dependency_cache';
import { registerHomeFeature } from './register_home_feature';
import { isFullLicense, isMlEnabled } from '../common/license';
import { ML_APP_ROUTE, PLUGIN_ICON_SOLUTION, PLUGIN_ID } from '../common/constants/app';
import type { MlCapabilities } from './shared';

export interface MlStartDependencies {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  uiActions: UiActionsStart;
  spaces?: SpacesPluginStart;
  embeddable: EmbeddableStart;
  maps?: MapsStartApi;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginStart;
  dataVisualizer: DataVisualizerPluginStart;
  fieldFormats: FieldFormatsStart;
  dashboard: DashboardStart;
  charts: ChartsPluginStart;
  lens?: LensPublicStart;
  cases?: CasesUiStart;
  security: SecurityPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  contentManagement: ContentManagementPublicStart;
  presentationUtil: PresentationUtilPluginStart;
}

export interface MlSetupDependencies {
  maps?: MapsSetupApi;
  licensing: LicensingPluginSetup;
  management?: ManagementSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  home?: HomePublicPluginSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  kibanaVersion: string;
  share: SharePluginSetup;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginSetup;
  alerting?: AlertingSetup;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsSetup;
  dashboard: DashboardSetup;
  cases?: CasesUiSetup;
}

export type MlCoreSetup = CoreSetup<MlStartDependencies, MlPluginStart>;

export class MlPlugin implements Plugin<MlPluginSetup, MlPluginStart> {
  private appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  private locator: undefined | MlLocator;
  private isServerless: boolean = false;

  constructor(private initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: MlCoreSetup, pluginsSetup: MlSetupDependencies) {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.ml.plugin.title', {
        defaultMessage: 'Machine Learning',
      }),
      order: 5000,
      euiIconType: PLUGIN_ICON_SOLUTION,
      appRoute: ML_APP_ROUTE,
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appUpdater$,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application/app');
        return renderApp(
          coreStart,
          {
            charts: pluginsStart.charts,
            data: pluginsStart.data,
            unifiedSearch: pluginsStart.unifiedSearch,
            dashboard: pluginsStart.dashboard,
            share: pluginsStart.share,
            security: pluginsStart.security,
            licensing: pluginsStart.licensing,
            management: pluginsSetup.management,
            licenseManagement: pluginsSetup.licenseManagement,
            home: pluginsSetup.home,
            embeddable: { ...pluginsSetup.embeddable, ...pluginsStart.embeddable },
            maps: pluginsStart.maps,
            uiActions: pluginsStart.uiActions,
            kibanaVersion: this.initializerContext.env.packageInfo.version,
            triggersActionsUi: pluginsStart.triggersActionsUi,
            dataVisualizer: pluginsStart.dataVisualizer,
            usageCollection: pluginsSetup.usageCollection,
            fieldFormats: pluginsStart.fieldFormats,
            lens: pluginsStart.lens,
            cases: pluginsStart.cases,
            savedObjectsManagement: pluginsStart.savedObjectsManagement,
            savedSearch: pluginsStart.savedSearch,
            contentManagement: pluginsStart.contentManagement,
            presentationUtil: pluginsStart.presentationUtil,
          },
          params,
          this.isServerless
        );
      },
    });

    if (pluginsSetup.share) {
      this.locator = pluginsSetup.share.url.locators.create(new MlLocatorDefinition());
    }

    if (pluginsSetup.management) {
      registerManagementSection(
        pluginsSetup.management,
        core,
        {
          usageCollection: pluginsSetup.usageCollection,
        },
        this.isServerless
      ).enable();
    }

    const licensing = pluginsSetup.licensing.license$.pipe(take(1));
    licensing.subscribe(async (license) => {
      const mlEnabled = isMlEnabled(license);
      const fullLicense = isFullLicense(license);
      const [coreStart, pluginStart] = await core.getStartServices();
      const { capabilities } = coreStart.application;
      const mlCapabilities = capabilities.ml as MlCapabilities;

      // register various ML plugin features which require a full license
      // note including registerHomeFeature in register_helper would cause the page bundle size to increase significantly
      if (mlEnabled) {
        // add ML to home page
        if (pluginsSetup.home) {
          registerHomeFeature(pluginsSetup.home);
        }

        const {
          registerEmbeddables,
          registerMlUiActions,
          registerSearchLinks,
          registerMlAlerts,
          registerMapExtension,
          registerCasesAttachments,
        } = await import('./register_helper');
        registerSearchLinks(this.appUpdater$, fullLicense, mlCapabilities);

        if (fullLicense) {
          registerMlUiActions(pluginsSetup.uiActions, core, this.isServerless);

          if (mlCapabilities.isADEnabled) {
            registerEmbeddables(pluginsSetup.embeddable, core, this.isServerless);

            if (pluginsSetup.cases) {
              registerCasesAttachments(pluginsSetup.cases, coreStart, pluginStart);
            }

            if (
              pluginsSetup.triggersActionsUi &&
              mlCapabilities.canUseMlAlerts &&
              mlCapabilities.canGetJobs
            ) {
              registerMlAlerts(pluginsSetup.triggersActionsUi, pluginsSetup.alerting);
            }

            if (pluginsSetup.maps) {
              // Pass canGetJobs as minimum permission to show anomalies card in maps layers
              await registerMapExtension(pluginsSetup.maps, core, {
                canGetJobs: mlCapabilities.canGetJobs,
                canCreateJobs: mlCapabilities.canCreateJob,
              });
            }
          }
        }
      } else {
        // if ml is disabled in elasticsearch, disable ML in kibana
        this.appUpdater$.next(() => ({
          status: AppStatus.inaccessible,
        }));
      }
    });

    return {
      locator: this.locator,
    };
  }

  start(core: CoreStart, deps: MlStartDependencies) {
    setDependencyCache({
      docLinks: core.docLinks!,
      basePath: core.http.basePath,
      http: core.http,
      i18n: core.i18n,
      lens: deps.lens,
    });

    return {
      locator: this.locator,
    };
  }

  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
