/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/public';

import { apiService } from './application/lib/api';
import { breadcrumbService } from './application/lib/breadcrumbs';
import { SetupDependencies, StartDependencies, AppDependencies, ClientConfigType } from './types';

export class UpgradeAssistantUIPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor(private ctx: PluginInitializerContext) {}

  setup(coreSetup: CoreSetup<StartDependencies>, { management, cloud, share }: SetupDependencies) {
    const {
      readonly,
      ui: { enabled: isUpgradeAssistantUiEnabled },
    } = this.ctx.config.get<ClientConfigType>();

    if (isUpgradeAssistantUiEnabled) {
      const appRegistrar = management.sections.section.stack;
      const kibanaVersion = new SemVer(this.ctx.env.packageInfo.version);

      const kibanaVersionInfo = {
        currentMajor: kibanaVersion.major,
        prevMajor: kibanaVersion.major - 1,
        nextMajor: kibanaVersion.major + 1,
      };

      const pluginName = i18n.translate('xpack.upgradeAssistant.appTitle', {
        defaultMessage: '{version} Upgrade Assistant',
        values: { version: `${kibanaVersionInfo.nextMajor}.0` },
      });

    appRegistrar.registerApp({
      id: 'upgrade_assistant',
      title: pluginName,
      order: 1,
      async mount(params) {
        const [coreStart, { discover, data }] = await coreSetup.getStartServices();

        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(pluginName);

        const appDependencies: AppDependencies = {
          kibanaVersionInfo,
          isReadOnlyMode: readonly,
          plugins: {
            cloud,
            share,
          },
          services: {
            core: coreStart,
            data,
            history: params.history,
            discover,
            api: apiService,
            breadcrumbs: breadcrumbService,
          },
        };

        const { mountManagementSection } = await import('./application/mount_management_section');
        const unmountAppCallback = mountManagementSection(params, appDependencies);

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      });
    }
  }

  start() {}
  stop() {}
}
