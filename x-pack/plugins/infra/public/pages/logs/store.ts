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
  reducer,
  searchSelectors,
  sourceSelectors,
  State,
  summarySelectors,
  targetSelectors,
} from '../../containers/logging_legacy/state';
import { InfraObservableApi } from '../../lib/lib';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}

export interface StoreDependencies {
  observableApi: Observable<InfraObservableApi>;
}

export function createStore({ observableApi }: StoreDependencies) {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    postToApi$: observableApi.pipe(map(({ post }) => post)),
    selectEntriesEndLoadingState: entriesSelectors.selectEntriesEndLoadingState,
    selectEntriesStartLoadingState: entriesSelectors.selectEntriesStartLoadingState,
    selectFirstEntry: entriesSelectors.selectFirstEntry,
    selectFirstSummaryBucket: summarySelectors.selectFirstSummaryBucket,
    selectLastEntry: entriesSelectors.selectLastEntry,
    selectLastSummaryBucket: summarySelectors.selectLastSummaryBucket,
    selectQuery: searchSelectors.selectQuery,
    selectSourceCoreFields: sourceSelectors.selectSourceCoreFields,
    selectSourceIndices: sourceSelectors.selectSourceIndices,
    selectSummaryBucketSize: summarySelectors.selectSummaryBucketSize,
    selectSummaryBucketsPerBuffer: summarySelectors.selectSummaryBucketsPerBuffer,
    selectTarget: targetSelectors.selectTarget,
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
