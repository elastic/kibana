/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../util/app_state_utils';
import { SelectSeverity, severity$ } from './select_severity';

module.service('mlSelectSeverityService', function (AppState, $rootScope) {
  subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => $rootScope.$applyAsync());
})
  .directive('mlSelectSeverity', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      wrapInI18nContext(SelectSeverity),
      undefined,
      { restrict: 'E' },
    );
  });
