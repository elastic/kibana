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

import { renderApp } from './application/render_app';

interface Dependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
}

export class UpgradeAssistantUIPlugin implements Plugin {
  constructor(private ctx: PluginInitializerContext) {}
  setup({ http, getStartServices }: CoreSetup, { cloud, management }: Dependencies) {
    const { enabled } = this.ctx.config.get<Config>();
    if (!enabled) {
      return;
    }
    const appRegistrar = management.sections.getSection('elasticsearch')!;
    const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

    appRegistrar.registerApp({
      id: 'upgrade_assistant',
      title: i18n.translate('xpack.upgradeAssistant.appTitle', {
        defaultMessage: '{version} Upgrade Assistant',
        values: { version: `${NEXT_MAJOR_VERSION}.0` },
      }),
      order: 1000,
      async mount({ element }) {
        const [{ i18n: i18nDep }] = await getStartServices();
        return renderApp({ element, isCloudEnabled, http, i18n: i18nDep });
      },
    });
  }

  start() {}
  stop() {}
}
