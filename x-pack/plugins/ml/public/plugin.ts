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
} from 'kibana/public';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';

import type { ManagementSetup } from 'src/plugins/management/public';
import type { SharePluginSetup, SharePluginStart } from 'src/plugins/share/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { HomePublicPluginSetup } from 'src/plugins/home/public';
import type { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import type { SpacesPluginStart } from '../../spaces/public';

import { AppStatus, AppUpdater, DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import type { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';

import type { LicenseManagementUIPluginSetup } from '../../license_management/public';
import type { LicensingPluginSetup } from '../../licensing/public';
import type { SecurityPluginSetup } from '../../security/public';

import { PLUGIN_ICON_SOLUTION, PLUGIN_ID } from '../common/constants/app';
import { isFullLicense, isMlEnabled } from '../common/license';

import { setDependencyCache } from './application/util/dependency_cache';
import { registerFeature } from './register_feature';
import { MlLocatorDefinition, MlLocator } from './locator';
import type { MapsStartApi, MapsSetupApi } from '../../maps/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import type { DataVisualizerPluginStart } from '../../data_visualizer/public';
import type { PluginSetupContract as AlertingSetup } from '../../alerting/public';
import { registerManagementSection } from './application/management';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import type {
  FieldFormatsSetup,
  FieldFormatsStart,
} from '../../../../src/plugins/field_formats/public';
import type { DashboardSetup, DashboardStart } from '../../../../src/plugins/dashboard/public';
import type { ChartsPluginStart } from '../../../../src/plugins/charts/public';

export interface MlStartDependencies {
  data: DataPublicPluginStart;
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
}

export interface MlSetupDependencies {
  security?: SecurityPluginSetup;
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
}

export type MlCoreSetup = CoreSetup<MlStartDependencies, MlPluginStart>;

export class MlPlugin implements Plugin<MlPluginSetup, MlPluginStart> {
  private appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  private locator: undefined | MlLocator;

  constructor(private initializerContext: PluginInitializerContext) {}

  setup(core: MlCoreSetup, pluginsSetup: MlSetupDependencies) {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.ml.plugin.title', {
        defaultMessage: 'Machine Learning',
      }),
      order: 5000,
      euiIconType: PLUGIN_ICON_SOLUTION,
      appRoute: '/app/ml',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appUpdater$,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const kibanaVersion = this.initializerContext.env.packageInfo.version;
        const { renderApp } = await import('./application/app');
        return renderApp(
          coreStart,
          {
            charts: pluginsStart.charts,
            data: pluginsStart.data,
            dashboard: pluginsStart.dashboard,
            share: pluginsStart.share,
            security: pluginsSetup.security,
            licensing: pluginsSetup.licensing,
            management: pluginsSetup.management,
            licenseManagement: pluginsSetup.licenseManagement,
            home: pluginsSetup.home,
            embeddable: { ...pluginsSetup.embeddable, ...pluginsStart.embeddable },
            maps: pluginsStart.maps,
            uiActions: pluginsStart.uiActions,
            kibanaVersion,
            triggersActionsUi: pluginsStart.triggersActionsUi,
            dataVisualizer: pluginsStart.dataVisualizer,
            usageCollection: pluginsSetup.usageCollection,
            fieldFormats: pluginsStart.fieldFormats,
          },
          params
        );
      },
    });

    if (pluginsSetup.share) {
      this.locator = pluginsSetup.share.url.locators.create(new MlLocatorDefinition());
    }

    if (pluginsSetup.management) {
      registerManagementSection(pluginsSetup.management, core, {
        usageCollection: pluginsSetup.usageCollection,
      }).enable();
    }

    const licensing = pluginsSetup.licensing.license$.pipe(take(1));
    licensing.subscribe(async (license) => {
      const [coreStart] = await core.getStartServices();
      const { capabilities } = coreStart.application;

      if (isMlEnabled(license)) {
        // add ML to home page
        if (pluginsSetup.home) {
          registerFeature(pluginsSetup.home);
        }
      } else {
        // if ml is disabled in elasticsearch, disable ML in kibana
        this.appUpdater$.next(() => ({
          status: AppStatus.inaccessible,
        }));
      }

      // register various ML plugin features which require a full license
      // note including registerFeature in register_helper would cause the page bundle size to increase significantly
      const {
        registerEmbeddables,
        registerMlUiActions,
        registerSearchLinks,
        registerMlAlerts,
        registerMapExtension,
      } = await import('./register_helper');

      const mlEnabled = isMlEnabled(license);
      const fullLicense = isFullLicense(license);

      if (pluginsSetup.maps) {
        // Pass capabilites.ml.canGetJobs as minimum permission to show anomalies card in maps layers
        const canGetJobs = capabilities.ml?.canGetJobs === true;
        const canCreateJobs = capabilities.ml?.canCreateJob === true;
        await registerMapExtension(pluginsSetup.maps, core, { canGetJobs, canCreateJobs });
      }

      if (mlEnabled) {
        registerSearchLinks(this.appUpdater$, fullLicense);

        if (fullLicense) {
          registerEmbeddables(pluginsSetup.embeddable, core);
          registerMlUiActions(pluginsSetup.uiActions, core);

          const canUseMlAlerts = capabilities.ml?.canUseMlAlerts;
          if (pluginsSetup.triggersActionsUi && canUseMlAlerts) {
            registerMlAlerts(pluginsSetup.triggersActionsUi, pluginsSetup.alerting);
          }
        }
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
    });

    return {
      locator: this.locator,
    };
  }

  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
