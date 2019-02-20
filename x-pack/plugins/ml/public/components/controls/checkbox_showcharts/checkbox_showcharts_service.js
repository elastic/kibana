/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { distinctUntilChanged } from 'rxjs/operators';

import { initializeAppState } from 'plugins/ml/factories/state_factory';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { showCharts$ } from './checkbox_showcharts';

const APP_STATE_NAME = 'mlCheckboxShowCharts';

// This service should not be consumed anywhere, it's main purpose is to
// restore an eventual state from the URL and pass that on the observable
// and then subscribe to changes to the observable to update the URL again.
module.service('mlCheckboxShowChartsService', function (AppState, $rootScope) {
  const appState = initializeAppState(AppState, APP_STATE_NAME, {
    showCharts: showCharts$.getValue()
  });

  showCharts$.next(appState[APP_STATE_NAME].showCharts);

  showCharts$.pipe(distinctUntilChanged()).subscribe(showCharts => {
    appState.fetch();
    appState[APP_STATE_NAME] = { showCharts };
    appState.save();
    $rootScope.$applyAsync();
  });
});
