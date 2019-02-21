/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from 'plugins/ml/factories/state_factory';

import { showCharts$ } from './checkbox_showcharts';

// This service should not be consumed anywhere, it's main purpose is to
// restore an eventual state from the URL and pass that on the observable
// and then subscribe to changes to the observable to update the URL again.
module.service('mlCheckboxShowChartsService', function (AppState, $rootScope) {
  const APP_STATE_NAME = 'mlCheckboxShowCharts';
  const APP_STATE_SUB_NAME = 'showCharts';
  subscribeAppStateToObservable(AppState, APP_STATE_NAME, APP_STATE_SUB_NAME, showCharts$, $rootScope);
});
