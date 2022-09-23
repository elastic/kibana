/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction, createReducer, current, PayloadAction } from '@reduxjs/toolkit';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { mapValues } from 'lodash';
import { Query } from '@kbn/es-query';
import { History } from 'history';
import { LensEmbeddableInput } from '..';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import type { VisualizeEditorContext, Suggestion, IndexPattern } from '../types';
import { getInitialDatasourceId, getResolvedDateRange, getRemoveOperation } from '../utils';
import type { DataViewsState, LensAppState, LensStoreDeps, VisualizationState } from './types';
import type { Datasource, Visualization } from '../types';
import { generateId } from '../id_generator';
import type { LayerType } from '../../common/types';
import { getLayerType } from '../editor_frame_service/editor_frame/config_panel/add_layer';
import { getVisualizeFieldSuggestions } from '../editor_frame_service/editor_frame/suggestion_helpers';
import type { FramePublicAPI, LensEditContextMapping, LensEditEvent } from '../types';
import { selectFramePublicAPI } from './selectors';

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
  dataViews: {
    indexPatternRefs: [],
    indexPatterns: {},
    existingFields: {},
    isFirstExistenceFetch: true,
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
      : (data.query.queryString.getQuery() as Query),
    filters: !initialContext
      ? data.query.filterManager.getGlobalFilters()
      : data.query.filterManager.getFilters(),
    searchSessionId: data.search.session.getSessionId(),
    resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
    isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
    activeDatasourceId: initialDatasourceId,
    datasourceStates,
    visualization: {
      state: null,
      activeId: Object.keys(visualizationMap)[0] || null,
    },
  };
  return state;
};

export const setState = createAction<Partial<LensAppState>>('lens/setState');
export const onActiveDataChange = createAction<{
  activeData: TableInspectorAdapter;
  requestWarnings?: string[];
}>('lens/onActiveDataChange');
export const setSaveable = createAction<boolean>('lens/setSaveable');
export const enableAutoApply = createAction<void>('lens/enableAutoApply');
export const disableAutoApply = createAction<void>('lens/disableAutoApply');
export const applyChanges = createAction<void>('lens/applyChanges');
export const setChangesApplied = createAction<boolean>('lens/setChangesApplied');
export const updateState = createAction<{
  updater: (prevState: LensAppState) => LensAppState;
}>('lens/updateState');
export const updateDatasourceState = createAction<{
  updater: unknown | ((prevState: unknown) => unknown);
  datasourceId: string;
  clearStagedPreview?: boolean;
}>('lens/updateDatasourceState');
export const updateVisualizationState = createAction<{
  visualizationId: string;
  newState: unknown;
}>('lens/updateVisualizationState');

export const insertLayer = createAction<{
  layerId: string;
  datasourceId: string;
}>('lens/insertLayer');

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
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  }) {
    return { payload: { layerId: generateId(), newState, initialContext } };
  }
);
export const editVisualizationAction = createAction<{
  visualizationId: string;
  event: LensEditEvent<keyof LensEditContextMapping>;
}>('lens/editVisualizationAction');
export const removeLayers = createAction<{
  visualizationId: VisualizationState['activeId'];
  layerIds: string[];
}>('lens/removeLayers');
export const removeOrClearLayer = createAction<{
  visualizationId: string;
  layerId: string;
  layerIds: string[];
}>('lens/removeOrClearLayer');

export const cloneLayer = createAction(
  'cloneLayer',
  function prepare({ layerId }: { layerId: string }) {
    return { payload: { newLayerId: generateId(), layerId } };
  }
);

export const addLayer = createAction<{
  layerId: string;
  layerType: LayerType;
}>('lens/addLayer');

export const setLayerDefaultDimension = createAction<{
  layerId: string;
  columnId: string;
  groupId: string;
}>('lens/setLayerDefaultDimension');

export const updateIndexPatterns = createAction<Partial<DataViewsState>>(
  'lens/updateIndexPatterns'
);
export const replaceIndexpattern = createAction<{ newIndexPattern: IndexPattern; oldId: string }>(
  'lens/replaceIndexPattern'
);
export const changeIndexPattern = createAction<{
  visualizationIds?: string[];
  datasourceIds?: string[];
  indexPatternId: string;
  layerId?: string;
  dataViews: Partial<DataViewsState>;
}>('lens/changeIndexPattern');

export const lensActions = {
  setState,
  onActiveDataChange,
  setSaveable,
  enableAutoApply,
  disableAutoApply,
  applyChanges,
  setChangesApplied,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  insertLayer,
  switchVisualization,
  rollbackSuggestion,
  setToggleFullscreen,
  submitSuggestion,
  switchDatasource,
  navigateAway,
  loadInitial,
  initEmpty,
  editVisualizationAction,
  removeLayers,
  removeOrClearLayer,
  addLayer,
  cloneLayer,
  setLayerDefaultDimension,
  updateIndexPatterns,
  replaceIndexpattern,
  changeIndexPattern,
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
    [onActiveDataChange.type]: (
      state,
      {
        payload: { activeData, requestWarnings },
      }: PayloadAction<{ activeData: TableInspectorAdapter; requestWarnings?: string[] }>
    ) => {
      return {
        ...state,
        activeData,
        requestWarnings,
      };
    },
    [setSaveable.type]: (state, { payload }: PayloadAction<boolean>) => {
      return {
        ...state,
        isSaveable: payload,
      };
    },
    [enableAutoApply.type]: (state) => {
      state.autoApplyDisabled = false;
    },
    [disableAutoApply.type]: (state) => {
      state.autoApplyDisabled = true;
      state.changesApplied = true;
    },
    [applyChanges.type]: (state) => {
      if (typeof state.applyChangesCounter === 'undefined') {
        state.applyChangesCounter = 0;
      }
      state.applyChangesCounter!++;
    },
    [setChangesApplied.type]: (state, { payload: applied }) => {
      state.changesApplied = applied;
    },
    [updateState.type]: (
      state,
      {
        payload: { updater },
      }: {
        payload: {
          updater: (prevState: LensAppState) => LensAppState;
        };
      }
    ) => {
      const newState = updater(current(state) as LensAppState);
      return {
        ...newState,
        stagedPreview: undefined,
      };
    },
    [cloneLayer.type]: (
      state,
      {
        payload: { layerId, newLayerId },
      }: {
        payload: {
          layerId: string;
          newLayerId: string;
        };
      }
    ) => {
      const clonedIDsMap = new Map<string, string>();

      const getNewId = (prevId: string) => {
        const inMapValue = clonedIDsMap.get(prevId);
        if (!inMapValue) {
          const newId = generateId();
          clonedIDsMap.set(prevId, newId);
          return newId;
        }
        return inMapValue;
      };

      if (!state.activeDatasourceId || !state.visualization.activeId) {
        return state;
      }

      state.datasourceStates = mapValues(state.datasourceStates, (datasourceState, datasourceId) =>
        datasourceId
          ? {
              ...datasourceState,
              state: datasourceMap[datasourceId].cloneLayer(
                datasourceState.state,
                layerId,
                newLayerId,
                getNewId
              ),
            }
          : datasourceState
      );
      state.visualization.state = visualizationMap[state.visualization.activeId].cloneLayer!(
        state.visualization.state,
        layerId,
        newLayerId,
        clonedIDsMap
      );
    },
    [removeOrClearLayer.type]: (
      state,
      {
        payload: { visualizationId, layerId, layerIds },
      }: {
        payload: {
          visualizationId: string;
          layerId: string;
          layerIds: string[];
        };
      }
    ) => {
      const activeVisualization = visualizationMap[visualizationId];
      const activeDataSource = datasourceMap[state.activeDatasourceId!];
      const isOnlyLayer =
        getRemoveOperation(
          activeVisualization,
          state.visualization.state,
          layerId,
          layerIds.length
        ) === 'clear';

      state.datasourceStates = mapValues(
        state.datasourceStates,
        (datasourceState, datasourceId) => {
          const datasource = datasourceMap[datasourceId!];
          return {
            ...datasourceState,
            state: isOnlyLayer
              ? datasource.clearLayer(datasourceState.state, layerId)
              : datasource.removeLayer(datasourceState.state, layerId),
          };
        }
      );
      state.stagedPreview = undefined;
      // reuse the activeDatasource current dataView id for the moment
      const currentDataViewsId = activeDataSource.getCurrentIndexPatternId(
        state.datasourceStates[state.activeDatasourceId!].state
      );
      state.visualization.state =
        isOnlyLayer || !activeVisualization.removeLayer
          ? activeVisualization.clearLayer(state.visualization.state, layerId, currentDataViewsId)
          : activeVisualization.removeLayer(state.visualization.state, layerId);
    },
    [changeIndexPattern.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          visualizationIds?: string;
          datasourceIds?: string;
          layerId?: string;
          indexPatternId: string;
          dataViews: Pick<DataViewsState, 'indexPatterns'>;
        };
      }
    ) => {
      const { visualizationIds, datasourceIds, layerId, indexPatternId, dataViews } = payload;
      const newIndexPatternRefs = [...state.dataViews.indexPatternRefs];
      const availableRefs = new Set(newIndexPatternRefs.map((ref) => ref.id));
      // check for missing refs
      Object.values(dataViews.indexPatterns || {}).forEach((indexPattern) => {
        if (!availableRefs.has(indexPattern.id)) {
          newIndexPatternRefs.push({
            id: indexPattern.id!,
            name: indexPattern.name,
            title: indexPattern.title,
          });
        }
      });
      const newState: Partial<LensAppState> = {
        dataViews: {
          ...state.dataViews,
          indexPatterns: dataViews.indexPatterns,
          indexPatternRefs: newIndexPatternRefs,
        },
      };
      if (visualizationIds?.length) {
        for (const visualizationId of visualizationIds) {
          const activeVisualization =
            visualizationId &&
            state.visualization.activeId === visualizationId &&
            visualizationMap[visualizationId];
          if (activeVisualization && layerId && activeVisualization?.onIndexPatternChange) {
            newState.visualization = {
              ...state.visualization,
              state: activeVisualization.onIndexPatternChange(
                state.visualization.state,
                indexPatternId,
                layerId
              ),
            };
          }
        }
      }
      if (datasourceIds?.length) {
        newState.datasourceStates = { ...state.datasourceStates };
        const frame = selectFramePublicAPI(
          { lens: { ...current(state), dataViews: newState.dataViews! } },
          datasourceMap
        );
        const datasourceLayers = frame.datasourceLayers;

        for (const datasourceId of datasourceIds) {
          const activeDatasource = datasourceId && datasourceMap[datasourceId];
          if (activeDatasource && activeDatasource?.onIndexPatternChange) {
            newState.datasourceStates = {
              ...newState.datasourceStates,
              [datasourceId]: {
                isLoading: false,
                state: activeDatasource.onIndexPatternChange(
                  newState.datasourceStates[datasourceId].state,
                  dataViews.indexPatterns,
                  indexPatternId,
                  layerId
                ),
              },
            };
            // Update the visualization columns
            if (layerId && state.visualization.activeId) {
              const nextPublicAPI = activeDatasource.getPublicAPI({
                state: newState.datasourceStates[datasourceId].state,
                layerId,
                indexPatterns: dataViews.indexPatterns,
              });
              const nextTable = new Set(
                nextPublicAPI.getTableSpec().map(({ columnId }) => columnId)
              );
              const datasourcePublicAPI = datasourceLayers[layerId];
              if (datasourcePublicAPI) {
                const removed = datasourcePublicAPI
                  .getTableSpec()
                  .map(({ columnId }) => columnId)
                  .filter((columnId) => !nextTable.has(columnId));
                const activeVisualization = visualizationMap[state.visualization.activeId];
                let nextVisState = (newState.visualization || state.visualization).state;
                removed.forEach((columnId) => {
                  nextVisState = activeVisualization.removeDimension({
                    layerId,
                    columnId,
                    prevState: nextVisState,
                    frame,
                  });
                });
                newState.visualization = {
                  ...state.visualization,
                  state: nextVisState,
                };
              }
            }
          }
        }
      }

      return { ...state, ...newState };
    },
    [updateIndexPatterns.type]: (state, { payload }: { payload: Partial<DataViewsState> }) => {
      return {
        ...state,
        dataViews: { ...state.dataViews, ...payload },
      };
    },
    [replaceIndexpattern.type]: (
      state,
      { payload }: { payload: { newIndexPattern: IndexPattern; oldId: string } }
    ) => {
      state.dataViews.indexPatterns[payload.newIndexPattern.id] = payload.newIndexPattern;
      delete state.dataViews.indexPatterns[payload.oldId];
      state.dataViews.indexPatternRefs = state.dataViews.indexPatternRefs.filter(
        (r) => r.id !== payload.oldId
      );
      state.dataViews.indexPatternRefs.push({
        id: payload.newIndexPattern.id,
        title: payload.newIndexPattern.title,
        name: payload.newIndexPattern.name,
      });
      const visualization = visualizationMap[state.visualization.activeId!];
      state.visualization.state =
        visualization.onIndexPatternRename?.(
          state.visualization.state,
          payload.oldId,
          payload.newIndexPattern.id
        ) ?? state.visualization.state;

      Object.entries(state.datasourceStates).forEach(([datasourceId, datasourceState]) => {
        const datasource = datasourceMap[datasourceId];
        state.datasourceStates[datasourceId].state =
          datasource?.onIndexPatternRename?.(
            datasourceState.state,
            payload.oldId,
            payload.newIndexPattern.id!
          ) ?? datasourceState.state;
      });
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
          newState: unknown;
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
          state: payload.newState,
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
              activeData: state.activeData,
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
          initialContext: VisualizeFieldContext | VisualizeEditorContext | undefined;
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
        dataViews: newState.dataViews,
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
    [editVisualizationAction.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          visualizationId: string;
          event: LensEditEvent<keyof LensEditContextMapping>;
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
      const activeVisualization = visualizationMap[payload.visualizationId];
      if (activeVisualization?.onEditAction) {
        state.visualization.state = activeVisualization.onEditAction(
          state.visualization.state,
          payload.event
        );
      }
    },
    [insertLayer.type]: (
      state,
      {
        payload,
      }: {
        payload: {
          layerId: string;
          datasourceId: string;
        };
      }
    ) => {
      const updater = datasourceMap[payload.datasourceId].insertLayer;
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.datasourceId]: {
            ...state.datasourceStates[payload.datasourceId],
            state: updater(
              current(state).datasourceStates[payload.datasourceId].state,
              payload.layerId
            ),
          },
        },
      };
    },
    [removeLayers.type]: (
      state,
      {
        payload: { visualizationId, layerIds },
      }: {
        payload: {
          visualizationId: VisualizationState['activeId'];
          layerIds: string[];
        };
      }
    ) => {
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }

      const activeVisualization = visualizationId && visualizationMap[visualizationId];

      // This is a safeguard that prevents us from accidentally updating the
      // wrong visualization. This occurs in some cases due to the uncoordinated
      // way we manage state across plugins.
      if (
        state.visualization.activeId === visualizationId &&
        activeVisualization &&
        activeVisualization.removeLayer &&
        state.visualization.state
      ) {
        const updater = layerIds.reduce(
          (acc, layerId) =>
            activeVisualization.removeLayer ? activeVisualization.removeLayer(acc, layerId) : acc,
          state.visualization.state
        );

        state.visualization.state =
          typeof updater === 'function' ? updater(current(state.visualization.state)) : updater;
      }
      layerIds.forEach((layerId) => {
        const [layerDatasourceId] =
          Object.entries(datasourceMap).find(([datasourceId, datasource]) => {
            return (
              state.datasourceStates[datasourceId] &&
              datasource.getLayers(state.datasourceStates[datasourceId].state).includes(layerId)
            );
          }) ?? [];
        if (layerDatasourceId) {
          state.datasourceStates[layerDatasourceId].state = datasourceMap[
            layerDatasourceId
          ].removeLayer(current(state).datasourceStates[layerDatasourceId].state, layerId);
        }
      });
    },

    [addLayer.type]: (
      state,
      {
        payload: { layerId, layerType },
      }: {
        payload: {
          layerId: string;
          layerType: LayerType;
        };
      }
    ) => {
      if (!state.activeDatasourceId || !state.visualization.activeId) {
        return state;
      }

      const activeVisualization = visualizationMap[state.visualization.activeId];
      const activeDatasource = datasourceMap[state.activeDatasourceId];
      // reuse the active datasource dataView id for the new layer
      const currentDataViewsId = activeDatasource.getCurrentIndexPatternId(
        state.datasourceStates[state.activeDatasourceId!].state
      );
      const visualizationState = activeVisualization.appendLayer!(
        state.visualization.state,
        layerId,
        layerType,
        currentDataViewsId
      );

      const framePublicAPI = selectFramePublicAPI({ lens: current(state) }, datasourceMap);

      const { noDatasource } =
        activeVisualization
          .getSupportedLayers(visualizationState, framePublicAPI)
          .find(({ type }) => type === layerType) || {};

      const datasourceState =
        !noDatasource && activeDatasource
          ? activeDatasource.insertLayer(
              state.datasourceStates[state.activeDatasourceId].state,
              layerId
            )
          : state.datasourceStates[state.activeDatasourceId].state;

      const { activeDatasourceState, activeVisualizationState } = addInitialValueIfAvailable({
        datasourceState,
        visualizationState,
        framePublicAPI,
        activeVisualization,
        activeDatasource,
        layerId,
        layerType,
      });

      state.visualization.state = activeVisualizationState;
      state.datasourceStates[state.activeDatasourceId].state = activeDatasourceState;
      state.stagedPreview = undefined;
    },
    [setLayerDefaultDimension.type]: (
      state,
      {
        payload: { layerId, columnId, groupId },
      }: {
        payload: {
          layerId: string;
          columnId: string;
          groupId: string;
        };
      }
    ) => {
      if (!state.activeDatasourceId || !state.visualization.activeId) {
        return state;
      }

      const activeDatasource = datasourceMap[state.activeDatasourceId];
      const activeVisualization = visualizationMap[state.visualization.activeId];
      const layerType = getLayerType(activeVisualization, state.visualization.state, layerId);
      const { activeDatasourceState, activeVisualizationState } = addInitialValueIfAvailable({
        datasourceState: state.datasourceStates[state.activeDatasourceId].state,
        visualizationState: state.visualization.state,
        framePublicAPI: selectFramePublicAPI({ lens: current(state) }, datasourceMap),
        activeVisualization,
        activeDatasource,
        layerId,
        layerType,
        columnId,
        groupId,
      });

      state.visualization.state = activeVisualizationState;
      state.datasourceStates[state.activeDatasourceId].state = activeDatasourceState;
    },
  });
};

function addInitialValueIfAvailable({
  visualizationState,
  datasourceState,
  activeVisualization,
  activeDatasource,
  framePublicAPI,
  layerType,
  layerId,
  columnId,
  groupId,
}: {
  framePublicAPI: FramePublicAPI;
  visualizationState: unknown;
  datasourceState: unknown;
  activeDatasource?: Datasource;
  activeVisualization: Visualization;
  layerId: string;
  layerType: string;
  columnId?: string;
  groupId?: string;
}) {
  const { initialDimensions, noDatasource } =
    activeVisualization
      .getSupportedLayers(visualizationState, framePublicAPI)
      .find(({ type }) => type === layerType) || {};

  if (initialDimensions) {
    const info = groupId
      ? initialDimensions.find(({ groupId: id }) => id === groupId)
      : initialDimensions[0]; // pick the first available one if not passed

    if (info) {
      const activeVisualizationState = activeVisualization.setDimension({
        groupId: info.groupId,
        layerId,
        columnId: columnId || info.columnId,
        prevState: visualizationState,
        frame: framePublicAPI,
      });

      if (!noDatasource && activeDatasource?.initializeDimension) {
        return {
          activeDatasourceState: activeDatasource.initializeDimension(
            datasourceState,
            layerId,
            framePublicAPI.dataViews.indexPatterns,
            {
              ...info,
              columnId: columnId || info.columnId,
            }
          ),
          activeVisualizationState,
        };
      } else {
        return {
          activeDatasourceState: datasourceState,
          activeVisualizationState,
        };
      }
    }
  }

  return {
    activeDatasourceState: datasourceState,
    activeVisualizationState: visualizationState,
  };
}
