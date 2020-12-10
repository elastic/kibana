/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import type {
  SharePluginSetup,
  SharePluginStart,
  UrlGeneratorContract,
} from 'src/plugins/share/public';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { HomePublicPluginSetup } from 'src/plugins/home/public';
import type { IndexPatternManagementSetup } from 'src/plugins/index_pattern_management/public';
import type { EmbeddableSetup } from 'src/plugins/embeddable/public';
import type { SpacesPluginStart } from '../../spaces/public';

import { AppStatus, AppUpdater, DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import type { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import type { KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';
import { MlCardState } from '../../../../src/plugins/index_pattern_management/public';

import type { LicenseManagementUIPluginSetup } from '../../license_management/public';
import type { LicensingPluginSetup } from '../../licensing/public';
import type { SecurityPluginSetup } from '../../security/public';

import { PLUGIN_ICON_SOLUTION, PLUGIN_ID } from '../common/constants/app';
import { ML_APP_URL_GENERATOR } from '../common/constants/ml_url_generator';
import { isFullLicense, isMlEnabled } from '../common/license';

import { setDependencyCache } from './application/util/dependency_cache';
import { registerFeature } from './register_feature';
// Not importing from `ml_url_generator/index` here to avoid importing unnecessary code
import { registerUrlGenerator } from './ml_url_generator/ml_url_generator';

export interface MlStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
  uiActions: UiActionsStart;
  spaces?: SpacesPluginStart;
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
  private urlGenerator: undefined | UrlGeneratorContract<typeof ML_APP_URL_GENERATOR>;

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
          params
        );
      },
    });

    if (pluginsSetup.share) {
      this.urlGenerator = registerUrlGenerator(pluginsSetup.share, core);
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

        // register ML for the index pattern management no data screen.
        pluginsSetup.indexPatternManagement.environment.update({
          ml: () =>
            capabilities.ml.canFindFileStructure ? MlCardState.ENABLED : MlCardState.HIDDEN,
        });
      } else {
        // if ml is disabled in elasticsearch, disable ML in kibana
        this.appUpdater.next(() => ({
          status: AppStatus.inaccessible,
        }));
      }

      // register various ML plugin features which require a full license
      const { registerEmbeddables, registerManagementSection, registerMlUiActions } = await import(
        './register_helper'
      );

      if (isMlEnabled(license) && isFullLicense(license)) {
        const canManageMLJobs = capabilities.management?.insightsAndAlerting?.jobsListLink ?? false;
        if (canManageMLJobs && pluginsSetup.management !== undefined) {
          registerManagementSection(pluginsSetup.management, core).enable();
        }
        registerEmbeddables(pluginsSetup.embeddable, core);
        registerMlUiActions(pluginsSetup.uiActions, core);
      }
    });

    return {
      urlGenerator: this.urlGenerator,
    };
  }

  start(core: CoreStart, deps: any) {
    setDependencyCache({
      docLinks: core.docLinks!,
      basePath: core.http.basePath,
      http: core.http,
      i18n: core.i18n,
    });
    return {
      urlGenerator: this.urlGenerator,
    };
  }

  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
