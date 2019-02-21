/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../factories/state_factory';
import { SelectInterval, interval$ } from './select_interval';

// This service should not be consumed anywhere, it's main purpose is to
// restore an eventual state from the URL and pass that on the observable
// and then subscribe to changes to the observable to update the URL again.
module.service('mlSelectIntervalService', function (AppState, $rootScope) {
  const APP_STATE_NAME = 'mlSelectInterval';
  const APP_STATE_SUB_NAME = 'interval';
  subscribeAppStateToObservable(AppState, APP_STATE_NAME, APP_STATE_SUB_NAME, interval$, $rootScope);
})
  .directive('mlSelectInterval', function ($injector) {
    const reactDirective = $injector.get('reactDirective');

    return reactDirective(
      SelectInterval,
      undefined,
      { restrict: 'E' }
    );
  });
