/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import reduceReducers from 'reduce-reducers';
import { combineReducers } from 'redux';

import { appReducer } from './app';
import { assetsReducer } from './assets';
import { elementsReducer } from './elements';
import { embeddableReducer } from './embeddable';
import { flyoutsReducer } from './flyouts';
import { historyReducer } from './history';
import { pagesReducer } from './pages';
import { resolvedArgsReducer } from './resolved_args';
import { sidebarReducer } from './sidebar';
import { transientReducer } from './transient';
import { workpadReducer } from './workpad';

export function getRootReducer(initialState) {
  return combineReducers({
    assets: assetsReducer,
    app: appReducer,
    transient: reduceReducers(
      transientReducer,
      resolvedArgsReducer,
      sidebarReducer,
      flyoutsReducer
    ),
    persistent: reduceReducers(
      historyReducer,
      combineReducers({
        workpad: reduceReducers(workpadReducer, pagesReducer, elementsReducer, embeddableReducer),
        schemaVersion: (state = get(initialState, 'persistent.schemaVersion')) => state,
      })
    ),
  });
}
