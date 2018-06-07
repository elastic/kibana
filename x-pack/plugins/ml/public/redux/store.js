/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  combineReducers,
  compose,
  createStore,
  applyMiddleware
} from 'redux';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/takeUntil';

import { anomalyExplorerModule } from './modules/anomaly_explorer';
import { dragSelectModule } from './modules/drag_select';

const mainReducer = combineReducers({
  anomalyExplorer: anomalyExplorerModule.reducer,
  dragSelect: dragSelectModule.reducer
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  mainReducer,
  composeEnhancers(applyMiddleware())
);

function getState$() {
  return new Observable(function (observer) {
    //observer.next(store.getState());

    return store.subscribe(() => observer.next(store.getState()));
  });
}

export const state$ = getState$(store);
