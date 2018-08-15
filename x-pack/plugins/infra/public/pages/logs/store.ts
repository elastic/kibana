/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, applyMiddleware, compose, createStore as createBasicStore } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  createRootEpic,
  entriesSelectors,
  initialState,
  logPositionSelectors,
  // searchSelectors,
  // sourceSelectors,
  reducer,
  State,
  // summarySelectors,
  // targetSelectors,
} from '../../containers/logging_legacy/state';
import { InfraApolloClient, InfraObservableApi } from '../../lib/lib';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}

export interface StoreDependencies {
  apolloClient: Observable<InfraApolloClient>;
  observableApi: Observable<InfraObservableApi>;
}

export function createStore({ apolloClient, observableApi }: StoreDependencies) {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    postToApi$: observableApi.pipe(map(({ post }) => post)),
    apolloClient$: apolloClient,
    selectIsLoadingEntries: entriesSelectors.selectIsLoadingEntries,
    selectEntriesEnd: entriesSelectors.selectEntriesEnd,
    selectEntriesStart: entriesSelectors.selectEntriesStart,
    selectHasMoreAfterEnd: entriesSelectors.selectHasMoreAfterEnd,
    selectHasMoreBeforeStart: entriesSelectors.selectHasMoreBeforeStart,
    selectIsAutoReloading: logPositionSelectors.selectIsAutoReloading,
    // selectEntriesEndLoadingState: entriesSelectors.selectEntriesEndLoadingState,
    // selectEntriesStartLoadingState: entriesSelectors.selectEntriesStartLoadingState,
    // selectFirstEntry: entriesSelectors.selectFirstEntry,
    // selectLastEntry: entriesSelectors.selectLastEntry,
    // selectQuery: searchSelectors.selectQuery,
    // selectSourceCoreFields: sourceSelectors.selectSourceCoreFields,
    // selectSourceIndices: sourceSelectors.selectSourceIndices,
    // selectTarget: targetSelectors.selectTarget,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  const store = createBasicStore(
    reducer,
    initialState,
    composeEnhancers(applyMiddleware(epicMiddleware))
  );

  epicMiddleware.run(createRootEpic<State>());

  return store;
}
