/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { fetch$, type FetchContext } from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { type KibanaExecutionContext } from '@kbn/core/public';
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
  startWith,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { COMPARE_ALL_OPTIONS, onlyDisabledFiltersChanged } from '@kbn/es-query';
import { getEditPath } from '../../common/constants';
import type {
  GetStateType,
  LensApi,
  LensInternalApi,
  LensPublicCallbacks,
  VisualizationContextHelper,
} from './types';
import { getExpressionRendererParams } from './expressions/expression_params';
import type { LensEmbeddableStartServices } from './types';
import { prepareCallbacks } from './expressions/callbacks';
import { buildUserMessagesHelpers } from './user_messages/api';
import { getLogError } from './expressions/telemetry';
import type { SharingSavedObjectProps, UserMessagesDisplayLocationId } from '../types';
import { apiHasLensComponentCallbacks } from './type_guards';
import { getRenderMode, getParentContext } from './helper';
import { addLog } from './logger';
import { getUsedDataViews } from './expressions/update_data_views';
import { getMergedSearchContext } from './expressions/merged_search_context';

const blockingMessageDisplayLocations: UserMessagesDisplayLocationId[] = [
  'visualization',
  'visualizationOnEmbeddable',
];

type ReloadReason =
  | 'attributes'
  | 'savedObjectId'
  | 'overrides'
  | 'disableTriggers'
  | 'viewMode'
  | 'searchContext';

type FetchType = Pick<
  FetchContext,
  'query' | 'filters' | 'timeRange' | 'timeslice' | 'searchSessionId'
>;

const shouldRefreshFilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
  state: false,
};

// this is borrowed from the previous Embeddable logic
function shouldFetch$(unifiedSearch$: BehaviorSubject<FetchType>, initialValue: FetchType) {
  return unifiedSearch$.pipe(
    startWith(initialValue),
    distinctUntilChanged((previous: FetchType, current: FetchType) => {
      if (
        !fastIsEqual(
          [previous.searchSessionId, previous.query, previous.timeRange, previous.timeslice],
          [current.searchSessionId, current.query, current.timeRange, current.timeslice]
        )
      ) {
        return false;
      }

      return onlyDisabledFiltersChanged(
        previous.filters,
        current.filters,
        shouldRefreshFilterCompareOptions
      );
    }),
    skip(1)
  );
}

/**
 * The function computes the expression used to render the panel and produces the necessary props
 * for the ExpressionWrapper component, binding any outer context to them.
 * @returns
 */
export function loadEmbeddableData(
  uuid: string,
  getState: GetStateType,
  api: LensApi,
  parentApi: unknown,
  internalApi: LensInternalApi,
  services: LensEmbeddableStartServices,
  { getVisualizationContext, updateVisualizationContext }: VisualizationContextHelper,
  metaInfo?: SharingSavedObjectProps
) {
  const { onLoad, onBeforeBadgesRender, ...callbacks } = apiHasLensComponentCallbacks(parentApi)
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

  const unifiedSearchInitialValue = {
    query: api.query$.getValue(),
    filters: api.filters$.getValue(),
    timeRange: api.timeRange$.getValue(),
    timeslice: api.timeslice$?.getValue(),
    searchSessionId: apiPublishesSearchSession(parentApi)
      ? parentApi.searchSessionId$.getValue()
      : '',
  };
  const unifiedSearch$ = new BehaviorSubject<FetchType>(unifiedSearchInitialValue);

  async function reload(
    // make reload easier to debug
    sourceId: ReloadReason
  ) {
    addLog(`Embeddable reload reason: ${sourceId}`);
    resetMessages();

    // reset the render on reload
    internalApi.dispatchRenderStart();

    // notify about data loading
    internalApi.updateDataLoading(true);

    // the component is ready to load
    if (apiHasLensComponentCallbacks(parentApi)) {
      parentApi.onLoad?.(true);
    }

    const currentState = getState();

    const { searchSessionId, ...unifiedSearch } = unifiedSearch$.getValue();

    const getExecutionContext = () => {
      const parentContext = getParentContext(parentApi);
      const lastState = getState();
      if (lastState.attributes) {
        const child: KibanaExecutionContext = {
          type: 'lens',
          name: lastState.attributes.visualizationType ?? '',
          id: uuid || 'new',
          description: lastState.attributes.title || lastState.title || '',
          url: `${services.coreStart.application.getUrlForApp('lens')}${getEditPath(
            lastState.savedObjectId
          )}`,
        };

        return parentContext
          ? {
              ...parentContext,
              child,
            }
          : child;
      }
    };

    const onDataCallback = (adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      updateVisualizationContext({
        activeData: adapters?.tables?.tables,
      });
      // data has loaded
      internalApi.updateDataLoading(false);
      // The third argument here is an observable to let the
      // consumer to be notified on data change
      onLoad?.(false, adapters, api.dataLoading);

      api.loadViewUnderlyingData();

      updateWarnings();
      // Render can still go wrong, so perfor a new check
      dispatchBlockingErrorIfAny();
    };

    const { onRender, onData, handleEvent, disableTriggers } = prepareCallbacks(
      api,
      internalApi,
      parentApi,
      getState,
      services,
      getExecutionContext(),
      onDataCallback,
      onRenderComplete,
      callbacks
    );

    const searchContext = getMergedSearchContext(
      currentState,
      unifiedSearch,
      api.timeRange$,
      parentApi,
      services
    );

    // Go concurrently: build the expression and fetch the dataViews
    const [{ params, abortController, ...rest }, dataViews] = await Promise.all([
      getExpressionRendererParams(currentState, {
        searchContext,
        api,
        settings: {
          syncColors: currentState.syncColors,
          syncCursor: currentState.syncCursor,
          syncTooltips: currentState.syncTooltips,
        },
        renderMode: getRenderMode(parentApi),
        services,
        searchSessionId,
        abortController: internalApi.expressionAbortController$.getValue(),
        getExecutionContext,
        logError: getLogError(getExecutionContext),
        addUserMessages,
        onRender,
        onData,
        handleEvent,
        disableTriggers,
        updateBlockingErrors,
        getDisplayOptions: internalApi.getDisplayOptions,
      }),
      getUsedDataViews(
        currentState.attributes.references,
        currentState.attributes.state?.adHocDataViews,
        services.dataViews
      ),
    ]);

    // update the visualization context before anything else
    // as it will be used to compute blocking errors also in case of issues
    updateVisualizationContext({
      doc: currentState.attributes,
      mergedSearchContext: params?.searchContext || {},
      ...rest,
    });

    // Publish the used dataViews on the Lens API
    internalApi.updateDataViews(dataViews);

    if (params?.expression != null && !dispatchBlockingErrorIfAny()) {
      internalApi.updateExpressionParams(params);
    }

    internalApi.updateAbortController(abortController);
  }

  // Build a custom operator to be resused for various observables
  function waitUntilChanged() {
    return pipe(distinctUntilChanged(fastIsEqual), skip(1));
  }

  const mergedSubscriptions = merge(
    // on fetch context change from the parentApi,
    // make sure to distill changes before reloading
    shouldFetch$(unifiedSearch$, unifiedSearchInitialValue).pipe(
      map(() => 'searchContext' as ReloadReason)
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
    // subscribe to the search context changes
    // will distill the output later on from the unifiedSearch$
    fetch$(api).subscribe((data) => {
      const searchSessionId = apiPublishesSearchSession(parentApi)
        ? data.searchSessionId ?? parentApi.searchSessionId$.getValue()
        : '';
      unifiedSearch$.next({
        query: data.query,
        filters: data.filters,
        timeRange: data.timeRange,
        timeslice: data.timeslice,
        searchSessionId,
      });
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
  // There are few key moments when errors are checked and displayed:
  // * at setup time (here) before the first expression evaluation
  // * at runtime => when the expression is running and ES/Kibana server could emit errors)
  // * at data time => data has arrived but for something goes wrong
  // * at render time => rendering happened but somethign went wrong
  // Bubble the error up to the embeddable system if any
  dispatchBlockingErrorIfAny();

  return {
    cleanup: () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
  };
}
