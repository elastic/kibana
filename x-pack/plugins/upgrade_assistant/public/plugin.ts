/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/public';

import { CloudSetup } from '../../cloud/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';

import { NEXT_MAJOR_VERSION } from '../common/version';
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

    const pluginName = i18n.translate('xpack.upgradeAssistant.appTitle', {
      defaultMessage: '{version} Upgrade Assistant',
      values: { version: `${NEXT_MAJOR_VERSION}.0` },
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
        const unmountAppCallback = await mountManagementSection(coreSetup, isCloudEnabled, params);

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
