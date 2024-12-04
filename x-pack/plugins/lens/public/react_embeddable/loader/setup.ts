/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiPublishesUnifiedSearch, fetch$ } from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  type Subscription,
  distinctUntilChanged,
  debounceTime,
  skip,
  pipe,
  merge,
  tap,
  map,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensPublicCallbacks,
  VisualizationContextHelper,
} from '../types';
import type { FetchType, ReloadReason } from './types';
import { buildUserMessagesHelpers } from '../user_messages/api';
import { apiHasLensComponentCallbacks } from '../type_guards';
import { getReloadFunction } from './reloader';
import { shouldFetch$ } from './helpers';
import type { SharingSavedObjectProps, UserMessagesDisplayLocationId } from '../../types';

const blockingMessageDisplayLocations: UserMessagesDisplayLocationId[] = [
  'visualization',
  'visualizationOnEmbeddable',
];

function prepareSearchContext(api: unknown) {
  if (apiPublishesUnifiedSearch(api)) {
    return {
      query: api.query$.getValue(),
      filters: api.filters$.getValue(),
      timeRange: api.timeRange$.getValue(),
      timeslice: api.timeslice$?.getValue(),
    };
  }
  return {
    query: undefined,
    filters: undefined,
    timeRange: undefined,
    timeslice: undefined,
  };
}

/**
 * The function computes the expression used to render the panel and produces the necessary props
 * for the ExpressionWrapper component, binding any outer context to them.
 * @returns
 */
export function loadEmbeddableData(
  getState: GetStateType,
  api: LensApi,
  parentApi: unknown,
  internalApi: LensInternalApi,
  services: LensEmbeddableStartServices,
  { getVisualizationContext, updateVisualizationContext }: VisualizationContextHelper,
  metaInfo?: SharingSavedObjectProps
) {
  const { onBeforeBadgesRender, ...callbacks } = apiHasLensComponentCallbacks(parentApi)
    ? parentApi
    : ({} as LensPublicCallbacks);

  // Some convenience api for the user messaging
  const {
    getUserMessages,
    addUserMessages,
    updateBlockingErrors,
    updateValidationErrors,
    updateWarnings,
    resetMessages,
    updateMessages,
  } = buildUserMessagesHelpers(
    api,
    internalApi,
    getVisualizationContext,
    services,
    onBeforeBadgesRender,
    services.spaces,
    metaInfo
  );

  const dispatchBlockingErrorIfAny = () => {
    const blockingErrors = getUserMessages(blockingMessageDisplayLocations, {
      severity: 'error',
    });
    updateValidationErrors(blockingErrors);
    updateBlockingErrors(blockingErrors);
    if (blockingErrors.length > 0) {
      internalApi.dispatchError();
    }
    return blockingErrors.length > 0;
  };

  const onRenderComplete = () => {
    updateMessages(getUserMessages('embeddableBadge'));
    // No issues so far, blocking errors are handled directly by Lens from this point on
    if (!dispatchBlockingErrorIfAny()) {
      internalApi.dispatchRenderComplete();
    }
  };

  const panelSearchContextInitialValue = prepareSearchContext(api);
  const panelSearchContext$ = new BehaviorSubject<FetchType>(panelSearchContextInitialValue);
  const unifiedSearchInitialValue = prepareSearchContext(parentApi);
  const unifiedSearch$ = new BehaviorSubject<FetchType>(unifiedSearchInitialValue);

  const reload = getReloadFunction(
    api,
    internalApi,
    parentApi,
    getState,
    unifiedSearch$,
    {
      addUserMessages,
      updateWarnings,
      resetMessages,
      updateBlockingErrors,
      dispatchBlockingErrorIfAny,
    },
    { onRenderComplete, updateVisualizationContext, ...callbacks },
    services
  );

  // Build a custom operator to be resused for various observables
  function waitUntilChanged() {
    return pipe(distinctUntilChanged(fastIsEqual), skip(1));
  }

  const mergedSubscriptions = merge(
    // on panel search context change, reload
    shouldFetch$(panelSearchContext$, panelSearchContextInitialValue).pipe(
      map(() => 'panelSearchContext' as ReloadReason)
    ),
    // on unified search context change, reload
    shouldFetch$(unifiedSearch$, unifiedSearchInitialValue).pipe(
      map(() => 'searchContext' as ReloadReason)
    ),
    // isolate the search session event
    api.searchSessionId$.pipe(
      waitUntilChanged(),
      map(() => 'searchSessionId' as ReloadReason)
    ),
    // On state change, reload
    // this is used to refresh the chart on inline editing
    // just make sure to avoid to rerender if there's no substantial change
    // make sure to debounce one tick to make the refresh work
    internalApi.attributes$.pipe(
      waitUntilChanged(),
      tap(() => {
        // the ES|QL query may have changed, so recompute the args for view underlying data
        if (api.isTextBasedLanguage()) {
          api.loadViewUnderlyingData();
        }
      }),
      map(() => 'attributes' as ReloadReason)
    ),
    api.savedObjectId.pipe(
      waitUntilChanged(),
      map(() => 'savedObjectId' as ReloadReason)
    ),
    internalApi.overrides$.pipe(
      waitUntilChanged(),
      map(() => 'overrides' as ReloadReason)
    ),
    internalApi.disableTriggers$.pipe(
      waitUntilChanged(),
      map(() => 'disableTriggers' as ReloadReason)
    )
  );

  const subscriptions: Subscription[] = [
    fetch$(api).subscribe((data) => {
      panelSearchContext$.next(data);
    }),
    mergedSubscriptions.pipe(debounceTime(0)).subscribe(reload),
    // make sure to reload on viewMode change
    api.viewMode.subscribe(() => {
      // only reload if drilldowns are set
      if (getState().enhancements?.dynamicActions) {
        reload('viewMode');
      }
    }),
  ];

  // the panel search context is already updated via the attributes$ subscription,
  // so add the unified search subscription only if the parentApi is not publishing it
  if (apiPublishesUnifiedSearch(parentApi)) {
    subscriptions.push(
      // subscribe to the search context changes
      // will distill the output later on from the unifiedSearch$
      fetch$(parentApi).subscribe((data) => {
        unifiedSearch$.next(data);
      })
    );
  }
  // There are few key moments when errors are checked and displayed:
  // * at setup time (here) before the first expression evaluation
  // * at runtime => when the expression is running and ES/Kibana server could emit errors)
  // * at data time => data has arrived but for something goes wrong
  // * at render time => rendering happened but somethign went wrong
  // Bubble the error up to the embeddable system if any
  dispatchBlockingErrorIfAny();

  return {
    // export it to test/debug it
    reload,
    cleanup: () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
  };
}
