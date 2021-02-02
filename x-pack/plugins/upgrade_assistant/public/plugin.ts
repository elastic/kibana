/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import SemVer from 'semver/classes/semver';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/public';

import { CloudSetup } from '../../cloud/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';

import { Config } from '../common/config';

interface Dependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
}

export class UpgradeAssistantUIPlugin implements Plugin {
  constructor(private ctx: PluginInitializerContext) {}
  setup(coreSetup: CoreSetup, { cloud, management }: Dependencies) {
    const { enabled } = this.ctx.config.get<Config>();

    if (!enabled) {
      return;
    }

    const appRegistrar = management.sections.section.stack;
    const isCloudEnabled = Boolean(cloud?.isCloudEnabled);
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
        const [coreStart] = await coreSetup.getStartServices();

        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(pluginName);

        const { mountManagementSection } = await import('./application/mount_management_section');
        const unmountAppCallback = await mountManagementSection(
          coreSetup,
          isCloudEnabled,
          params,
          kibanaVersionInfo
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
