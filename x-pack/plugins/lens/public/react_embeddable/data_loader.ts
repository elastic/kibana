/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import { fetch$, apiHasExecutionContext, type FetchContext } from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { type KibanaExecutionContext } from '@kbn/core/public';
import {
  BehaviorSubject,
  type Subscription,
  distinctUntilChanged,
  skip,
  debounceTime,
  pipe,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
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
import type { SharingSavedObjectProps } from '../types';
import { apiHasLensComponentCallbacks } from './type_guards';
import { getViewMode } from './helper';
import { getUsedDataViews } from './expressions/update_data_views';
import { addLog } from './logger';

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

  const onRenderComplete = () => {
    internalApi.dispatchRenderComplete();

    updateMessages(getUserMessages('embeddableBadge'));
    updateBlockingErrors();
  };

  const unifiedSearch$ = new BehaviorSubject<
    Pick<FetchContext, 'query' | 'filters' | 'timeRange' | 'timeslice' | 'searchSessionId'>
  >({
    query: undefined,
    filters: undefined,
    timeRange: undefined,
    timeslice: undefined,
    searchSessionId: undefined,
  });

  async function reload(
    // make reload easier to debug
    sourceId:
      | 'attributes'
      | 'savedObjectId'
      | 'overrides'
      | 'disableTriggers'
      | 'viewMode'
      | 'searchContext'
  ) {
    addLog(`Embeddable reload reason: ${sourceId}`);
    resetMessages();
    // reset the render on reload
    // internalApi.dispatchRenderStart();
    // notify about data loading
    internalApi.updateDataLoading(true);

    const currentState = getState();

    const { searchSessionId, ...unifiedSearch } = unifiedSearch$.getValue();

    const getExecutionContext = () => {
      const parentContext = apiHasExecutionContext(parentApi)
        ? parentApi.executionContext
        : undefined;
      const lastState = getState();
      if (lastState.attributes) {
        const child: KibanaExecutionContext = {
          type: 'lens',
          name: lastState.attributes.visualizationType ?? '',
          id: uuid || 'new',
          description: lastState.attributes.title || lastState.title || '',
          url: getEditPath(lastState.savedObjectId),
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
      resetMessages();
      updateVisualizationContext({
        activeData: adapters?.tables?.tables,
      });
      // data has loaded
      internalApi.updateDataLoading(false);
      // The third argument here is an observable to let the
      // consumer to be notified on data change
      onLoad?.(false, adapters, api.dataLoading);

      updateWarnings();
      updateBlockingErrors();
    };

    const { onRender, onData, handleEvent, disableTriggers } = prepareCallbacks(
      api,
      parentApi,
      getState,
      services,
      getExecutionContext,
      onDataCallback,
      onRenderComplete,
      callbacks
    );

    // Go concurrently: build the expression and fetch the dataViews
    const [{ params, abortController, ...rest }, dataViews] = await Promise.all([
      getExpressionRendererParams(currentState, {
        unifiedSearch,
        api,
        settings: {
          syncColors: currentState.syncColors,
          syncCursor: currentState.syncCursor,
          syncTooltips: currentState.syncTooltips,
        },
        renderMode: (getViewMode(parentApi) ?? 'view') as RenderMode,
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

    if (params?.expression != null) {
      internalApi.updateExpressionParams(params);
    } else {
      // trigger a render complete on error
      onRenderComplete();
    }
    internalApi.updateAbortController(abortController);

    internalApi.updateRenderCount();
  }

  // Build a custom operator to be resused for various observables
  function waitUntilChanged() {
    return pipe(distinctUntilChanged(fastIsEqual), skip(1), debounceTime(0));
  }

  const subscriptions: Subscription[] = [
    // on data change from the parentApi, reload
    fetch$(api).subscribe((data) => {
      const searchSessionId = apiPublishesSearchSession(parentApi) ? data.searchSessionId : '';
      unifiedSearch$.next({
        query: data.query,
        filters: data.filters,
        timeRange: data.timeRange,
        timeslice: data.timeslice,
        searchSessionId,
      });

      reload('searchContext');
    }),
    // make sure to reload on viewMode change
    api.viewMode.subscribe(() => {
      // only reload if drilldowns are set
      if (getState().enhancements?.dynamicActions) {
        reload('viewMode');
      }
    }),
    // On state change, reload
    // this is used to refresh the chart on inline editing
    // just make sure to avoid to rerender if there's no substantial change
    // make sure to debounce one tick to make the refresh work
    internalApi.attributes$.pipe(waitUntilChanged()).subscribe(() => reload('attributes')),
    api.savedObjectId.pipe(waitUntilChanged()).subscribe(() => reload('savedObjectId')),
    internalApi.overrides$.pipe(waitUntilChanged()).subscribe(() => reload('overrides')),
    internalApi.disableTriggers$
      .pipe(waitUntilChanged())
      .subscribe(() => reload('disableTriggers')),
  ];

  return {
    cleanup: () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
  };
}
