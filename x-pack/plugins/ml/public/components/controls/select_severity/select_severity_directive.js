/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../factories/state_factory';
import { SelectSeverity, severity$ } from './select_severity';

// This service should not be consumed anywhere, it's main purpose is to
// restore an eventual state from the URL and pass that on the observable
// and then subscribe to changes to the observable to update the URL again.
module.service('mlSelectSeverityService', function (AppState, $rootScope) {
  const APP_STATE_NAME = 'mlSelectSeverity';
  const APP_STATE_SUB_NAME = 'threshold';
  subscribeAppStateToObservable(AppState, APP_STATE_NAME, APP_STATE_SUB_NAME, severity$, $rootScope);
})
  .directive('mlSelectSeverity', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      wrapInI18nContext(SelectSeverity),
      undefined,
      { restrict: 'E' },
    );
  });
