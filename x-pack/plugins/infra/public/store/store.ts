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
  initialState,
  logEntriesSelectors,
  logPositionSelectors,
  metricTimeSelectors,
  reducer,
  sharedSelectors,
  State,
  waffleTimeSelectors,
} from '.';
import { InfraApolloClient, InfraObservableApi } from '../lib/lib';

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
    selectIsLoadingLogEntries: logEntriesSelectors.selectIsLoadingEntries,
    selectLogEntriesEnd: logEntriesSelectors.selectEntriesEnd,
    selectLogEntriesStart: logEntriesSelectors.selectEntriesStart,
    selectHasMoreLogEntriesAfterEnd: logEntriesSelectors.selectHasMoreAfterEnd,
    selectHasMoreLogEntriesBeforeStart: logEntriesSelectors.selectHasMoreBeforeStart,
    selectIsAutoReloadingLogEntries: logPositionSelectors.selectIsAutoReloading,
    selectLogFilterQueryAsJson: sharedSelectors.selectLogFilterQueryAsJson,
    selectLogTargetPosition: logPositionSelectors.selectTargetPosition,
    selectVisibleLogMidpointOrTarget: logPositionSelectors.selectVisibleMidpointOrTarget,
    selectVisibleLogSummary: logPositionSelectors.selectVisibleSummary,
    selectWaffleTimeUpdatePolicyInterval: waffleTimeSelectors.selectTimeUpdatePolicyInterval,
    selectMetricTimeUpdatePolicyInterval: metricTimeSelectors.selectTimeUpdatePolicyInterval,
    selectMetricRangeFromTimeRange: metricTimeSelectors.selectRangeFromTimeRange,
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
