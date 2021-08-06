/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/public';

import { AppServicesContext } from './types';
import { Config } from '../common/config';

export class UpgradeAssistantUIPlugin implements Plugin {
  constructor(private ctx: PluginInitializerContext) {}
  setup(coreSetup: CoreSetup, { management, cloud }: AppServicesContext) {
    const { enabled, readonly } = this.ctx.config.get<Config>();

    if (!enabled) {
      return;
    }

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

    const isCloudEnabled: boolean = Boolean(cloud?.isCloudEnabled);
    const cloudDeploymentUrl: string = `${cloud?.baseUrl ?? ''}/deployments/${
      cloud?.cloudId ?? ''
    }`;

    appRegistrar.registerApp({
      id: 'upgrade_assistant',
      title: pluginName,
      order: 1,
      async mount(params) {
        const [coreStart] = await coreSetup.getStartServices();

        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(pluginName);

        const { mountManagementSection } = await import('./application/mount_management_section');
        const unmountAppCallback = await mountManagementSection(
          coreSetup,
          params,
          kibanaVersionInfo,
          readonly,
          isCloudEnabled,
          cloudDeploymentUrl
        );

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });
  }

  start() {}
  stop() {}
}
