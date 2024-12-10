/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { RenderMode } from '@kbn/expressions-plugin/common';
import { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import { toExpression } from '@kbn/interpreter';
import { noop } from 'lodash';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import {
  CellValueContext,
  cellValueTrigger,
  CELL_VALUE_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { DocumentToExpressionReturnType } from '../../async_services';
import { LensDocument } from '../../persistence';
import {
  GetCompatibleCellValueActions,
  IndexPatternMap,
  IndexPatternRef,
  UserMessage,
  VisualizationDisplayOptions,
  isLensFilterEvent,
  isLensMultiFilterEvent,
  isLensTableRowContextMenuClickEvent,
} from '../../types';
import type {
  ExpressionWrapperProps,
  LensApi,
  LensEmbeddableStartServices,
  LensRuntimeState,
} from '../types';
import { getVariables } from './variables';
// import {
//   getSearchContextIncompatibleMessage,
//   isSearchContextIncompatibleWithDataViews,
// } from '../user_messages/checks';
import { getExecutionSearchContext, type MergedSearchContext } from './merged_search_context';

interface GetExpressionRendererPropsParams {
  searchContext: MergedSearchContext;
  disableTriggers?: boolean;
  renderMode?: RenderMode;
  settings: {
    syncColors?: boolean;
    syncCursor?: boolean;
    syncTooltips?: boolean;
  };
  services: LensEmbeddableStartServices;
  getExecutionContext: () => KibanaExecutionContext | undefined;
  searchSessionId?: string;
  abortController?: AbortController;
  onRender: (count: number) => void;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData: ExpressionWrapperProps['onData$'];
  logError: (type: 'runtime' | 'validation') => void;
  api: LensApi;
  addUserMessages: (messages: UserMessage[]) => void;
  updateBlockingErrors: (error: Error) => void;
  getDisplayOptions: () => VisualizationDisplayOptions;
}

async function getExpressionFromDocument(
  document: LensDocument,
  documentToExpression: (doc: LensDocument) => Promise<DocumentToExpressionReturnType>
) {
  const { ast, indexPatterns, indexPatternRefs, activeVisualizationState, activeDatasourceState } =
    await documentToExpression(document);
  return {
    expression: ast ? toExpression(ast) : null,
    indexPatterns,
    indexPatternRefs,
    activeVisualizationState,
    activeDatasourceState,
  };
}

function buildHasCompatibleActions(api: LensApi, { uiActions }: LensEmbeddableStartServices) {
  return async (event: ExpressionRendererEvent): Promise<boolean> => {
    if (!uiActions?.getTriggerCompatibleActions) {
      return false;
    }
    if (
      isLensTableRowContextMenuClickEvent(event) ||
      isLensMultiFilterEvent(event) ||
      isLensFilterEvent(event)
    ) {
      const actions = await uiActions.getTriggerCompatibleActions(
        VIS_EVENT_TO_TRIGGER[event.name],
        {
          data: event.data,
          embeddable: api,
        }
      );

      return actions.length > 0;
    }

    return false;
  };
}

function buildGetCompatibleCellValueActions(
  api: LensApi,
  { uiActions }: LensEmbeddableStartServices
): GetCompatibleCellValueActions {
  return async (data) => {
    if (!uiActions?.getTriggerCompatibleActions) {
      return [];
    }
    const actions: Array<Action<CellValueContext>> = (await uiActions.getTriggerCompatibleActions(
      CELL_VALUE_TRIGGER,
      { data, embeddable: api }
    )) as Array<Action<CellValueContext>>;
    return actions
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      .map((action) => ({
        id: action.id,
        type: action.type,
        iconType: action.getIconType({ embeddable: api, data, trigger: cellValueTrigger })!,
        displayName: action.getDisplayName({ embeddable: api, data, trigger: cellValueTrigger }),
        execute: (cellData) =>
          action.execute({ embeddable: api, data: cellData, trigger: cellValueTrigger }),
      }));
  };
}

export async function getExpressionRendererParams(
  state: LensRuntimeState,
  {
    settings: { syncColors = true, syncCursor = true, syncTooltips = false },
    services,
    disableTriggers = false,
    getExecutionContext,
    searchSessionId,
    abortController,
    onRender,
    handleEvent,
    onData = noop,
    logError,
    api,
    addUserMessages,
    updateBlockingErrors,
    searchContext,
    getDisplayOptions,
  }: GetExpressionRendererPropsParams
): Promise<{
  params: ExpressionWrapperProps | null;
  abortController?: AbortController;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
  activeVisualizationState?: unknown;
  activeDatasourceState?: unknown;
}> {
  const { expressionRenderer, documentToExpression } = services;

  const {
    expression,
    indexPatterns,
    indexPatternRefs,
    activeVisualizationState,
    activeDatasourceState,
  } = await getExpressionFromDocument(state.attributes, documentToExpression);

  // Apparently this change produces had lots of issues with solutions not using
  // the Embeddable incorrectly. Will comment for now and later on will restore it when
  // https://github.com/elastic/kibana/issues/200236 is resolved
  //
  // if at least one indexPattern is time based, then the Lens embeddable requires the timeRange prop
  // this is necessary for the dataview embeddable but not the ES|QL one
  // if (
  //   isSearchContextIncompatibleWithDataViews(
  //     api,
  //     getExecutionContext(),
  //     searchContext,
  //     indexPatternRefs,
  //     indexPatterns
  //   )
  // ) {
  //   addUserMessages([getSearchContextIncompatibleMessage()]);
  // }

  if (expression) {
    const params: ExpressionWrapperProps = {
      expression,
      syncColors,
      syncCursor,
      syncTooltips,
      searchSessionId,
      onRender$: onRender,
      handleEvent,
      onData$: onData,
      // Remove ES|QL query from it
      searchContext: getExecutionSearchContext(searchContext),
      interactive: !disableTriggers,
      executionContext: getExecutionContext(),
      lensInspector: {
        getInspectorAdapters: api.getInspectorAdapters,
        inspect: api.inspect,
        closeInspector: api.closeInspector,
      },
      ExpressionRenderer: expressionRenderer,
      addUserMessages,
      onRuntimeError: (error: Error) => {
        updateBlockingErrors(error);
        logError('runtime');
      },
      abortController,
      hasCompatibleActions: buildHasCompatibleActions(api, services),
      getCompatibleCellValueActions: buildGetCompatibleCellValueActions(api, services),
      variables: getVariables(api, state),
      style: state.style,
      className: state.className,
      noPadding: getDisplayOptions().noPadding,
    };
    return {
      indexPatterns,
      indexPatternRefs,
      activeVisualizationState,
      activeDatasourceState,
      params,
      abortController,
    };
  }

  return {
    params: null,
    abortController,
    indexPatterns,
    indexPatternRefs,
    activeVisualizationState,
    activeDatasourceState,
  };
}
