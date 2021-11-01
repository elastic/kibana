/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction, createReducer, current, PayloadAction } from '@reduxjs/toolkit';
import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { History } from 'history';
import { LensEmbeddableInput } from '..';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { getInitialDatasourceId, getResolvedDateRange } from '../utils';
import { LensAppState, LensStoreDeps } from './types';
import { generateId } from '../id_generator';
import {
  getVisualizeFieldSuggestions,
  Suggestion,
} from '../editor_frame_service/editor_frame/suggestion_helpers';

export const initialState: LensAppState = {
  persistedDoc: undefined,
  searchSessionId: '',
  filters: [],
  query: { language: 'kuery', query: '' },
  resolvedDateRange: { fromDate: '', toDate: '' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: null,
  datasourceStates: {},
  visualization: {
    state: null,
    activeId: null,
  },
};

export const getPreloadedState = ({
  lensServices: { data },
  initialContext,
  embeddableEditorIncomingState,
  datasourceMap,
  visualizationMap,
}: LensStoreDeps) => {
  const initialDatasourceId = getInitialDatasourceId(datasourceMap);
  const datasourceStates: LensAppState['datasourceStates'] = {};
  if (initialDatasourceId) {
    datasourceStates[initialDatasourceId] = {
      state: null,
      isLoading: true,
    };
  }

  const state = {
    ...initialState,
    isLoading: true,
    // Do not use app-specific filters from previous app,
    // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
    query: !initialContext
      ? data.query.queryString.getDefaultQuery()
      : data.query.queryString.getQuery(),
    filters: !initialContext
      ? data.query.filterManager.getGlobalFilters()
      : data.query.filterManager.getFilters(),
    searchSessionId: data.search.session.getSessionId(),
    resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
    isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
    activeDatasourceId: initialDatasourceId,
    datasourceStates,
    visualization: {
      state: null as unknown,
      activeId: Object.keys(visualizationMap)[0] || null,
    },
  };
  return state;
};

export const setState = createAction<Partial<LensAppState>>('lens/setState');
export const onActiveDataChange = createAction<TableInspectorAdapter>('lens/onActiveDataChange');
export const setSaveable = createAction<boolean>('lens/setSaveable');
export const updateState = createAction<{
  subType: string;
  updater: (prevState: LensAppState) => LensAppState;
}>('lens/updateState');
export const updateDatasourceState = createAction<{
  updater: unknown | ((prevState: unknown) => unknown);
  datasourceId: string;
  clearStagedPreview?: boolean;
}>('lens/updateDatasourceState');
export const updateVisualizationState = createAction<{
  visualizationId: string;
  updater: unknown;
  clearStagedPreview?: boolean;
}>('lens/updateVisualizationState');

export const updateLayer = createAction<{
  layerId: string;
  datasourceId: string;
  updater: (state: unknown, layerId: string) => unknown;
}>('lens/updateLayer');

export const switchVisualization = createAction<{
  suggestion: {
    newVisualizationId: string;
    visualizationState: unknown;
    datasourceState?: unknown;
    datasourceId?: string;
  };
  clearStagedPreview?: boolean;
}>('lens/switchVisualization');
export const rollbackSuggestion = createAction<void>('lens/rollbackSuggestion');
export const setToggleFullscreen = createAction<void>('lens/setToggleFullscreen');
export const submitSuggestion = createAction<void>('lens/submitSuggestion');
export const switchDatasource = createAction<{
  newDatasourceId: string;
}>('lens/switchDatasource');
export const navigateAway = createAction<void>('lens/navigateAway');
export const loadInitial = createAction<{
  initialInput?: LensEmbeddableInput;
  redirectCallback: (savedObjectId?: string) => void;
  history: History<unknown>;
}>('lens/loadInitial');
export const initEmpty = createAction(
  'initEmpty',
  function prepare({
    newState,
    initialContext,
  }: {
    newState: Partial<LensAppState>;
    initialContext?: VisualizeFieldContext;
  }) {
    return { payload: { layerId: generateId(), newState, initialContext } };
  }
);

export const lensActions = {
  setState,
  onActiveDataChange,
  setSaveable,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  updateLayer,
  switchVisualization,
  rollbackSuggestion,
  setToggleFullscreen,
  submitSuggestion,
  switchDatasource,
  navigateAway,
  loadInitial,
  initEmpty,
};

export const makeLensReducer = (storeDeps: LensStoreDeps) => {
  const { datasourceMap, visualizationMap } = storeDeps;
  return createReducer<LensAppState>(initialState, {
    [setState.type]: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    [onActiveDataChange.type]: (state, { payload }: PayloadAction<TableInspectorAdapter>) => {
      return {
        ...state,
        activeData: payload,
      };
    },
    [setSaveable.type]: (state, { payload }: PayloadAction<boolean>) => {
      return {
        ...state,
        isSaveable: payload,
      };
    },
    [updateState.type]: (
      state,
      action: {
        payload: {
          subType: string;
          updater: (prevState: LensAppState) => LensAppState;
        };
      }
    ) => {
      return action.payload.updater(current(state) as LensAppState);
    },
    [updateDatasourceState.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          updater: unknown | ((prevState: unknown) => unknown);
          datasourceId: string;
          clearStagedPreview?: boolean;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.datasourceId]: {
            state:
              typeof payload.updater === 'function'
                ? payload.updater(current(state).datasourceStates[payload.datasourceId].state)
                : payload.updater,
            isLoading: false,
          },
        },
        stagedPreview: payload.clearStagedPreview ? undefined : state.stagedPreview,
      };
    },
    [updateVisualizationState.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          visualizationId: string;
          updater: unknown | ((state: unknown) => unknown);
          clearStagedPreview?: boolean;
        };
      }
    ) => {
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
      // This is a safeguard that prevents us from accidentally updating the
      // wrong visualization. This occurs in some cases due to the uncoordinated
      // way we manage state across plugins.
      if (state.visualization.activeId !== payload.visualizationId) {
        return state;
      }
      return {
        ...state,
        visualization: {
          ...state.visualization,
          state:
            typeof payload.updater === 'function'
              ? payload.updater(current(state.visualization.state))
              : payload.updater,
        },
        stagedPreview: payload.clearStagedPreview ? undefined : state.stagedPreview,
      };
    },
    [updateLayer.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          layerId: string;
          datasourceId: string;
          updater: (state: unknown, layerId: string) => unknown;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.datasourceId]: {
            ...state.datasourceStates[payload.datasourceId],
            state: payload.updater(
              current(state).datasourceStates[payload.datasourceId].state,
              payload.layerId
            ),
          },
        },
      };
    },

    [switchVisualization.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          suggestion: {
            newVisualizationId: string;
            visualizationState: unknown;
            datasourceState?: unknown;
            datasourceId?: string;
          };
          clearStagedPreview?: boolean;
        };
      }
    ) => {
      const { newVisualizationId, visualizationState, datasourceState, datasourceId } =
        payload.suggestion;
      return {
        ...state,
        datasourceStates: datasourceId
          ? {
              ...state.datasourceStates,
              [datasourceId]: {
                ...state.datasourceStates[datasourceId],
                state: datasourceState,
              },
            }
          : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: newVisualizationId,
          state: visualizationState,
        },
        stagedPreview: payload.clearStagedPreview
          ? undefined
          : state.stagedPreview || {
              datasourceStates: state.datasourceStates,
              visualization: state.visualization,
            },
      };
    },
    [rollbackSuggestion.type]: (state) => {
      return {
        ...state,
        ...(state.stagedPreview || {}),
        stagedPreview: undefined,
      };
    },
    [setToggleFullscreen.type]: (state) => {
      return { ...state, isFullscreenDatasource: !state.isFullscreenDatasource };
    },
    [submitSuggestion.type]: (state) => {
      return {
        ...state,
        stagedPreview: undefined,
      };
    },
    [switchDatasource.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          newDatasourceId: string;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.newDatasourceId]: state.datasourceStates[payload.newDatasourceId] || {
            state: null,
            isLoading: true,
          },
        },
        activeDatasourceId: payload.newDatasourceId,
      };
    },
    [navigateAway.type]: (state) => state,
    [loadInitial.type]: (
      state,
      payload: PayloadAction<{
        initialInput?: LensEmbeddableInput;
        redirectCallback: (savedObjectId?: string) => void;
        history: History<unknown>;
      }>
    ) => state,
    [initEmpty.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          newState: Partial<LensAppState>;
          initialContext: VisualizeFieldContext | undefined;
          layerId: string;
        };
      }
    ) => {
      const newState = {
        ...state,
        ...payload.newState,
      };
      const suggestion: Suggestion | undefined = getVisualizeFieldSuggestions({
        datasourceMap,
        datasourceStates: newState.datasourceStates,
        visualizationMap,
        visualizeTriggerFieldContext: payload.initialContext,
      });
      if (suggestion) {
        return {
          ...newState,
          datasourceStates: {
            ...newState.datasourceStates,
            [suggestion.datasourceId!]: {
              ...newState.datasourceStates[suggestion.datasourceId!],
              state: suggestion.datasourceState,
            },
          },
          visualization: {
            ...newState.visualization,
            activeId: suggestion.visualizationId,
            state: suggestion.visualizationState,
          },
          stagedPreview: undefined,
        };
      }

      const visualization = newState.visualization;

      if (!visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }

      const activeVisualization = visualizationMap[visualization.activeId];
      if (visualization.state === null && activeVisualization) {
        const activeDatasourceId = getInitialDatasourceId(datasourceMap)!;
        const newVisState = activeVisualization.initialize(() => payload.layerId);
        const activeDatasource = datasourceMap[activeDatasourceId];
        return {
          ...newState,
          activeDatasourceId,
          datasourceStates: {
            ...newState.datasourceStates,
            [activeDatasourceId]: {
              ...newState.datasourceStates[activeDatasourceId],
              state: activeDatasource.insertLayer(
                newState.datasourceStates[activeDatasourceId]?.state,
                payload.layerId
              ),
            },
          },
          visualization: {
            ...visualization,
            state: newVisState,
          },
        };
      }
      return newState;
    },
  });
};
