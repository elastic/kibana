/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/public';
import { renderApp } from './application/render_app';

import { CloudSetup } from '../../cloud/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';

import { NEXT_MAJOR_VERSION } from '../common/version';

interface Dependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
}

export class UpgradeAssistantUIPlugin implements Plugin {
  setup({ http, getStartServices }: CoreSetup, { cloud, management }: Dependencies) {
    const appRegistrar = management.sections.getSection('kibana')!;
    const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

    appRegistrar.registerApp({
      id: 'upgrade_assistant',
      title: i18n.translate('xpack.upgradeAssistant.appTitle', {
        defaultMessage: '{version} Upgrade Assistant',
        values: { version: `${NEXT_MAJOR_VERSION}.0` },
      }),
      order: 100,
      async mount({ element }) {
        const [{ i18n: i18nDep }] = await getStartServices();
        return renderApp({ element, isCloudEnabled, http, i18n: i18nDep });
      },
    });
  }

  start() {}
  stop() {}
}
