/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { management } from 'ui/management';
// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import routes from 'ui/routes';
import { NEXT_MAJOR_VERSION } from '../common/version';
import { RootComponent } from './app';

const BASE_PATH = `/management/elasticsearch/upgrade_assistant`;

function startApp() {
  management.getSection('elasticsearch').register('upgrade_assistant', {
    visible: true,
    display: i18n.translate('xpack.upgradeAssistant.appTitle', {
      defaultMessage: '{version} Upgrade Assistant',
      values: { version: `${NEXT_MAJOR_VERSION}.0` },
    }),
    order: 100,
    url: `#${BASE_PATH}`,
  });

  uiModules.get('kibana').directive('upgradeAssistant', (reactDirective: any) => {
    return reactDirective(wrapInI18nContext(RootComponent));
  });

  routes.when(`${BASE_PATH}/:view?`, {
    template:
      '<kbn-management-app section="elasticsearch/upgrade_assistant"><upgrade-assistant /></kbn-management-app>',
  });
}

startApp();
