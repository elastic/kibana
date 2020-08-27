/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { ManagementSetup } from 'src/plugins/management/public';
import { SharePluginSetup, SharePluginStart } from 'src/plugins/share/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { IndexPatternManagementSetup } from 'src/plugins/index_pattern_management/public';
import { EmbeddableSetup } from 'src/plugins/embeddable/public';
import { AppStatus, AppUpdater, DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { MlCardState } from '../../../../src/plugins/index_pattern_management/public';
import { SecurityPluginSetup } from '../../security/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { registerManagementSection } from './application/management';
import { LicenseManagementUIPluginSetup } from '../../license_management/public';
import { setDependencyCache } from './application/util/dependency_cache';
import { PLUGIN_ICON, PLUGIN_ID } from '../common/constants/app';
import { registerFeature } from './register_feature';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { registerMlUiActions } from './ui_actions';
import { KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';
import { registerUrlGenerator } from './url_generator';
import { isFullLicense, isMlEnabled } from '../common/license';
import { registerEmbeddables } from './embeddables';

export interface MlStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
  uiActions: UiActionsStart;
}
export interface MlSetupDependencies {
  security?: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  management?: ManagementSetup;
  usageCollection: UsageCollectionSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  home?: HomePublicPluginSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  kibanaVersion: string;
  share: SharePluginSetup;
  indexPatternManagement: IndexPatternManagementSetup;
}

export type MlCoreSetup = CoreSetup<MlStartDependencies, MlPluginStart>;

export class MlPlugin implements Plugin<MlPluginSetup, MlPluginStart> {
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private initializerContext: PluginInitializerContext) {}

  setup(core: MlCoreSetup, pluginsSetup: MlSetupDependencies) {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.ml.plugin.title', {
        defaultMessage: 'Machine Learning',
      }),
      order: 5000,
      euiIconType: PLUGIN_ICON,
      appRoute: '/app/ml',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appUpdater,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const kibanaVersion = this.initializerContext.env.packageInfo.version;
        const { renderApp } = await import('./application/app');
        return renderApp(
          coreStart,
          {
            data: pluginsStart.data,
            share: pluginsStart.share,
            kibanaLegacy: pluginsStart.kibanaLegacy,
            security: pluginsSetup.security,
            licensing: pluginsSetup.licensing,
            management: pluginsSetup.management,
            usageCollection: pluginsSetup.usageCollection,
            licenseManagement: pluginsSetup.licenseManagement,
            home: pluginsSetup.home,
            embeddable: pluginsSetup.embeddable,
            uiActions: pluginsStart.uiActions,
            kibanaVersion,
          },
          {
            element: params.element,
            appBasePath: params.appBasePath,
            onAppLeave: params.onAppLeave,
            history: params.history,
          }
        );
      },
    });

    const licensing = pluginsSetup.licensing.license$.pipe(take(1));
    licensing.subscribe(async (license) => {
      const [coreStart] = await core.getStartServices();
      if (isMlEnabled(license)) {
        // add ML to home page
        if (pluginsSetup.home) {
          registerFeature(pluginsSetup.home);
        }

        // register ML for the index pattern management no data screen.
        pluginsSetup.indexPatternManagement.environment.update({
          ml: () =>
            coreStart.application.capabilities.ml.canFindFileStructure
              ? MlCardState.ENABLED
              : MlCardState.HIDDEN,
        });

        // register various ML plugin features which require a full license
        if (isFullLicense(license)) {
          registerManagementSection(pluginsSetup.management, core);
          registerEmbeddables(pluginsSetup.embeddable, core);
          registerMlUiActions(pluginsSetup.uiActions, core);
          registerUrlGenerator(pluginsSetup.share, core);
        }
      } else {
        // if ml is disabled in elasticsearch, disable ML in kibana
        this.appUpdater.next(() => ({
          status: AppStatus.inaccessible,
        }));
      }
    });

    return {};
  }

  start(core: CoreStart, deps: any) {
    setDependencyCache({
      docLinks: core.docLinks!,
      basePath: core.http.basePath,
      http: core.http,
      i18n: core.i18n,
    });
    return {};
  }

  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
