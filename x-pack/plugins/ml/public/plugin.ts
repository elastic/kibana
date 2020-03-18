/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreStart, CoreSetup, AppMountParameters } from 'kibana/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { SecurityPluginSetup } from '../../security/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { initManagementSection } from './application/management';
import { setDependencyCache } from './application/util/dependency_cache';
import { PLUGIN_ID, PLUGIN_ICON } from '../common/constants/app';

export interface MlStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}
export interface MlSetupDependencies {
  security: SecurityPluginSetup;
  licensing: LicensingPluginSetup;
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
}

export class MlPlugin implements Plugin<Setup, Start> {
  setup(core: CoreSetup<MlStartDependencies>, pluginsSetup: MlSetupDependencies) {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.ml.plugin.title', {
        defaultMessage: 'Machine Learning',
      }),
      order: 30,
      euiIconType: PLUGIN_ICON,
      appRoute: '/app/ml',
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application/app');
        return renderApp(
          coreStart,
          {
            data: pluginsStart.data,
            share: pluginsStart.share,
            security: pluginsSetup.security,
            licensing: pluginsSetup.licensing,
            management: pluginsSetup.management,
            usageCollection: pluginsSetup.usageCollection,
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

    initManagementSection(pluginsSetup, core);
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

export type Setup = ReturnType<MlPlugin['setup']>;
export type Start = ReturnType<MlPlugin['start']>;
