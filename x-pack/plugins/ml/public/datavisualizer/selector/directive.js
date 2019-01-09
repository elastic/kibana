/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';

import { injectI18nProvider } from '@kbn/i18n/react';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { getDataVisualizerBreadcrumbs } from '../breadcrumbs';
import { checkBasicLicense } from 'plugins/ml/license/check_license';
import { checkFindFileStructurePrivilege } from 'plugins/ml/privilege/check_privilege';

import uiRoutes from 'ui/routes';

const template = `<ml-nav-menu name="datavisualizer" /><datavisualizer-selector class="ml-datavisualizer-selector"/>`;

uiRoutes
  .when('/datavisualizer', {
    template,
    k7Breadcrumbs: getDataVisualizerBreadcrumbs,
    resolve: {
      CheckLicense: checkBasicLicense,
      privileges: checkFindFileStructurePrivilege,
    }
  });


import { DatavisualizerSelector } from './datavisualizer_selector';

module.directive('datavisualizerSelector', function ($injector) {
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(injectI18nProvider(DatavisualizerSelector), undefined, { restrict: 'E' }, { });
});
