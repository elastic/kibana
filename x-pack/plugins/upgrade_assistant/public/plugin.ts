/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/public';

import { apiService } from './application/lib/api';
import { breadcrumbService } from './application/lib/breadcrumbs';
import { uiMetricService } from './application/lib/ui_metric';
import { SetupDependencies, StartDependencies, AppDependencies, ClientConfigType } from './types';

export class UpgradeAssistantUIPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor(private ctx: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<StartDependencies>,
    { management, cloud, share, usageCollection }: SetupDependencies
  ) {
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
        defaultMessage: 'Upgrade Assistant',
      });

      if (usageCollection) {
        uiMetricService.setup(usageCollection);
      }

      appRegistrar.registerApp({
        id: 'upgrade_assistant',
        title: pluginName,
        order: 1,
        async mount(params) {
          const [coreStart, { data, ...plugins }] = await coreSetup.getStartServices();

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
              // Infra plugin doesnt export anything as a public interface. So the only
              // way we have at this stage for checking if the plugin is available or not
              // is by checking if the startServices has the `infra` key.
              infra: plugins.hasOwnProperty('infra') ? {} : undefined,
            },
            services: {
              core: coreStart,
              data,
              history: params.history,
              api: apiService,
              breadcrumbs: breadcrumbService,
            },
            theme$: params.theme$,
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
