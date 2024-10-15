/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import {
  fetch$,
  apiHasExecutionContext,
  type FetchContext,
  apiPublishesViewMode,
} from '@kbn/presentation-publishing';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { type KibanaExecutionContext } from '@kbn/core/public';
import { BehaviorSubject, type Subscription, distinctUntilChanged, skip } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { getEditPath } from '../../common/constants';
import type {
  ExpressionWrapperProps,
  GetStateType,
  LensApi,
  LensInternalApi,
  LensPublicCallbacks,
  VisualizationContextHelper,
} from './types';
import { getExpressionRendererParams } from './expressions/expression_params';
import type { LensEmbeddableStartServices } from './types';
import { prepareCallbacks } from './expressions/callbacks';
import { buildUserMessagesHelpers } from './user_messages/methods';
import { getLogError } from './expressions/telemetry';
import type { SharingSavedObjectProps, UserMessagesDisplayLocationId } from '../types';
import { apiHasLensComponentCallbacks } from './type_guards';
import { getViewMode } from './helper';
import { getUsedDataViews } from './expressions/update_data_views';

const blockingMessageDisplayLocations: UserMessagesDisplayLocationId[] = [
  'visualization',
  'visualizationOnEmbeddable',
];

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

  // Some convenience user messages methods
  const {
    getUserMessages,
    addUserMessage,
    updateMessages,
    updateBlockingErrors,
    updateWarnings,
    resetMessages,
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

    internalApi.updateMessages(getUserMessages('embeddableBadge'));
    const blockingMessages = getUserMessages(blockingMessageDisplayLocations, {
      severity: 'error',
    });
    internalApi.updateBlockingMessages(blockingMessages);
    updateBlockingErrors(blockingMessages);
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

  async function reload() {
    resetMessages();
    // reset the render on reload
    internalApi.dispatchRenderStart();
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
      updateVisualizationContext({
        activeData: adapters?.tables?.tables,
      });
      // data has loaded
      internalApi.updateDataLoading(false);
      // The third argument here is an observable to let the
      // consumer to be notified on data change
      onLoad?.(false, adapters, api.dataLoading);

      updateWarnings();
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
        logError: getLogError(getExecutionContext, onRenderComplete),
        addUserMessage,
        onRender,
        onData,
        handleEvent,
        disableTriggers,
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

      reload();
    }),
    // On state change, reload
    // this is used to refresh the chart on inline editing
    // just make sure to avoid to rerender if there's no substantial change
    internalApi.attributes$.pipe(distinctUntilChanged(fastIsEqual), skip(1)).subscribe(reload),
    api.savedObjectId.pipe(distinctUntilChanged(fastIsEqual), skip(1)).subscribe(reload),
    internalApi.overrides$.pipe(distinctUntilChanged(fastIsEqual), skip(1)).subscribe(reload),
    internalApi.disableTriggers$.pipe(distinctUntilChanged(fastIsEqual), skip(1)).subscribe(reload),
  ];
  if (apiPublishesViewMode(parentApi)) {
    subscriptions.push(
      parentApi.viewMode.subscribe(() => {
        // only reload if drilldowns are set
        if (getState().enhancements?.dynamicActions) {
          reload();
        }
      })
    );
  }

  return {
    cleanup: () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
  };
}

export function hasExpressionParamsToRender(
  params: Partial<ExpressionWrapperProps>
): params is ExpressionWrapperProps {
  return params.expression != null;
}
