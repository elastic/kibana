/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { management } from 'ui/management';
// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import routes from 'ui/routes';
import { RootComponent } from './app';

const BASE_PATH = `/management/upgrade_checkup`;

function startApp() {
  management.getSection('elasticsearch').register('upgrade_checkup', {
    visible: true,
    display: i18n.translate('xpack.upgradeCheckup.appTitle', {
      defaultMessage: '{version} Upgrade Assistant',
      // TODO: pull the version from the code
      values: { version: '7.0' },
    }),
    order: 100,
    url: `#${BASE_PATH}`,
  });

  uiModules.get('kibana').directive('upgradeCheckup', (reactDirective: any) => {
    return reactDirective(RootComponent);
  });

  routes.when(`/management/upgrade_checkup/:view?`, {
    template: '<upgrade-checkup />',
  });
}

startApp();
