/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { subscribeAppStateToObservable } from '../../../util/app_state_utils';
import { showCharts$ } from './checkbox_showcharts';

module.service('mlCheckboxShowChartsService', function (AppState, $rootScope) {
  subscribeAppStateToObservable(AppState, 'mlShowCharts', showCharts$, () => $rootScope.$applyAsync());
});
