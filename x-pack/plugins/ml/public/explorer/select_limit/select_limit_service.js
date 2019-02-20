/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
* AngularJS service for storing limit values in AppState.
*/

import { distinctUntilChanged } from 'rxjs/operators';

import { initializeAppState } from '../../factories/state_factory';

import { limit$ } from './select_limit';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

const APP_STATE_NAME = 'mlSelectLimit';

// This service should not be consumed anywhere, it's main purpose is to
// restore an eventual state from the URL and pass that on the observable
// and then subscribe to changes to the observable to update the URL again.
module.service('mlSelectLimitService', function (AppState, $rootScope) {
  const appState = initializeAppState(AppState, APP_STATE_NAME, {
    limit: limit$.getValue()
  });

  limit$.next(appState[APP_STATE_NAME].limit);

  limit$.pipe(distinctUntilChanged()).subscribe(limit => {
    appState.fetch();
    appState[APP_STATE_NAME] = { limit };
    appState.save();
    $rootScope.$applyAsync();
  });
});
