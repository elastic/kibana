/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { getEditPath } from '../../../common/constants';
import { UserMessage } from '../../types';
import { prepareCallbacks } from '../expressions/callbacks';
import { getExpressionRendererParams } from '../expressions/expression_params';
import { getMergedSearchContext } from '../expressions/merged_search_context';
import { getLogError } from '../expressions/telemetry';
import { getUsedDataViews } from '../expressions/update_data_views';
import { getParentContext, getRenderMode } from '../helper';
import { addLog } from '../logger';
import { apiHasLensComponentCallbacks } from '../type_guards';
import type {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensPublicCallbacks,
  VisualizationContextHelper,
} from '../types';
import { FetchType, ReloadReason } from './types';

export function getReloadFunction(
  api: LensApi,
  internalApi: LensInternalApi,
  parentApi: unknown,
  getState: GetStateType,
  unifiedSearch$: BehaviorSubject<FetchType>,
  {
    addUserMessages,
    updateWarnings,
    resetMessages,
    updateBlockingErrors,
    dispatchBlockingErrorIfAny,
  }: {
    addUserMessages: (messages: UserMessage[]) => void;
    updateWarnings: () => void;
    resetMessages: () => void;
    updateBlockingErrors: (blockingMessages: Error | UserMessage[]) => void;
    dispatchBlockingErrorIfAny: () => boolean;
  },
  {
    onRenderComplete,
    updateVisualizationContext,
    onLoad,
    ...callbacks
  }: {
    onRenderComplete: () => void;
    updateVisualizationContext: VisualizationContextHelper['updateVisualizationContext'];
  } & LensPublicCallbacks,
  services: LensEmbeddableStartServices
) {
  return async function reload(
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

    const getExecutionContext = () => {
      const parentContext = getParentContext(parentApi);
      const lastState = getState();
      if (lastState.attributes) {
        const child: KibanaExecutionContext = {
          type: 'lens',
          name: lastState.attributes.visualizationType ?? '',
          id: api.uuid || 'new',
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
      unifiedSearch$.getValue(),
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
        searchSessionId: api.searchSessionId$.getValue(),
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
  };
}
