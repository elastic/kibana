/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, useState, useCallback, useRef } from 'react';
import { CoreStart } from 'kibana/public';
import { isEqual } from 'lodash';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import { getAllIndexPatterns } from '../../utils';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { Datasource, FramePublicAPI, Visualization } from '../../types';
import { reducer, getInitialState } from './state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { Document } from '../../persistence/saved_object_store';
import { DragDropIdentifier, RootDragDropProvider } from '../../drag_drop';
import { getSavedObjectFormat } from './save';
import { generateId } from '../../id_generator';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import { EditorFrameStartPlugins } from '../service';
import { initializeDatasources, createDatasourceLayers } from './state_helpers';
import {
  applyVisualizeFieldSuggestions,
  getTopSuggestionForField,
  switchToSuggestion,
  Suggestion,
} from './suggestion_helpers';
import { trackUiEvent } from '../../lens_ui_telemetry';
import {
  useLensSelector,
  useLensDispatch,
  LensAppState,
  DispatchSetState,
  onChangeFromEditorFrame,
} from '../../state_management';

export interface EditorFrameProps {
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  ExpressionRenderer: ReactExpressionRendererType;
  palettes: PaletteRegistry;
  onError: (e: { message: string }) => void;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
  initialContext?: VisualizeFieldContext;
}

export function EditorFrame(props: EditorFrameProps) {
  const {
    filters,
    searchSessionId,
    savedQuery,
    query,
    persistedDoc,
    indexPatternsForTopNav,
    lastKnownDoc,
    activeData,
    isSaveable,
    resolvedDateRange: dateRange,
  } = useLensSelector((state) => state.app);
  const [state, dispatch] = useReducer(reducer, { ...props, doc: persistedDoc }, getInitialState);
  const dispatchLens = useLensDispatch();
  const dispatchChange: DispatchSetState = useCallback(
    (s: Partial<LensAppState>) => dispatchLens(onChangeFromEditorFrame(s)),
    [dispatchLens]
  );
  const [visualizeTriggerFieldContext, setVisualizeTriggerFieldContext] = useState(
    props.initialContext
  );
  const { onError } = props;
  const activeVisualization =
    state.visualization.activeId && props.visualizationMap[state.visualization.activeId];

  const allLoaded = Object.values(state.datasourceStates).every(
    ({ isLoading }) => typeof isLoading === 'boolean' && !isLoading
  );

  // Initialize current datasource and all active datasources
  useEffect(
    () => {
      // prevents executing dispatch on unmounted component
      let isUnmounted = false;
      if (!allLoaded) {
        initializeDatasources(
          props.datasourceMap,
          state.datasourceStates,
          persistedDoc?.references,
          visualizeTriggerFieldContext,
          { isFullEditor: true }
        )
          .then((result) => {
            if (!isUnmounted) {
              Object.entries(result).forEach(([datasourceId, { state: datasourceState }]) => {
                dispatch({
                  type: 'UPDATE_DATASOURCE_STATE',
                  updater: datasourceState,
                  datasourceId,
                });
              });
            }
          })
          .catch(onError);
      }
      return () => {
        isUnmounted = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLoaded, onError]
  );
  const datasourceLayers = createDatasourceLayers(props.datasourceMap, state.datasourceStates);

  const framePublicAPI: FramePublicAPI = {
    datasourceLayers,
    activeData,
    dateRange,
    query,
    filters,
    searchSessionId,
    availablePalettes: props.palettes,

    addNewLayer() {
      const newLayerId = generateId();

      dispatch({
        type: 'UPDATE_LAYER',
        datasourceId: state.activeDatasourceId!,
        layerId: newLayerId,
        updater: props.datasourceMap[state.activeDatasourceId!].insertLayer,
      });

      return newLayerId;
    },

    removeLayers(layerIds: string[]) {
      if (activeVisualization && activeVisualization.removeLayer && state.visualization.state) {
        dispatch({
          type: 'UPDATE_VISUALIZATION_STATE',
          visualizationId: activeVisualization.id,
          updater: layerIds.reduce(
            (acc, layerId) =>
              activeVisualization.removeLayer ? activeVisualization.removeLayer(acc, layerId) : acc,
            state.visualization.state
          ),
        });
      }

      layerIds.forEach((layerId) => {
        const layerDatasourceId = Object.entries(props.datasourceMap).find(
          ([datasourceId, datasource]) =>
            state.datasourceStates[datasourceId] &&
            datasource.getLayers(state.datasourceStates[datasourceId].state).includes(layerId)
        )![0];
        dispatch({
          type: 'UPDATE_LAYER',
          layerId,
          datasourceId: layerDatasourceId,
          updater: props.datasourceMap[layerDatasourceId].removeLayer,
        });
      });
    },
  };

  useEffect(
    () => {
      if (persistedDoc) {
        dispatch({
          type: 'VISUALIZATION_LOADED',
          doc: {
            ...persistedDoc,
            state: {
              ...persistedDoc.state,
              visualization: persistedDoc.visualizationType
                ? props.visualizationMap[persistedDoc.visualizationType].initialize(
                    framePublicAPI,
                    persistedDoc.state.visualization
                  )
                : persistedDoc.state.visualization,
            },
          },
        });
      } else {
        dispatch({
          type: 'RESET',
          state: getInitialState(props),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistedDoc]
  );

  // Initialize visualization as soon as all datasources are ready
  useEffect(
    () => {
      if (allLoaded && state.visualization.state === null && activeVisualization) {
        const initialVisualizationState = activeVisualization.initialize(framePublicAPI);
        dispatch({
          type: 'UPDATE_VISUALIZATION_STATE',
          visualizationId: activeVisualization.id,
          updater: initialVisualizationState,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLoaded, activeVisualization, state.visualization.state]
  );

  // Get suggestions for visualize field when all datasources are ready
  useEffect(() => {
    if (allLoaded && visualizeTriggerFieldContext && !persistedDoc) {
      applyVisualizeFieldSuggestions({
        datasourceMap: props.datasourceMap,
        datasourceStates: state.datasourceStates,
        visualizationMap: props.visualizationMap,
        activeVisualizationId: state.visualization.activeId,
        visualizationState: state.visualization.state,
        visualizeTriggerFieldContext,
        dispatch,
      });
      setVisualizeTriggerFieldContext(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded]);

  const getStateToUpdate: (
    arg: {
      filterableIndexPatterns: string[];
      doc: Document;
      isSaveable: boolean;
    },
    oldState: {
      isSaveable: boolean;
      indexPatternsForTopNav: IndexPattern[];
      persistedDoc?: Document;
      lastKnownDoc?: Document;
    }
  ) => Promise<Partial<LensAppState> | undefined> = async (
    { filterableIndexPatterns, doc, isSaveable: incomingIsSaveable },
    prevState
  ) => {
    const batchedStateToUpdate: Partial<LensAppState> = {};

    if (incomingIsSaveable !== prevState.isSaveable) {
      batchedStateToUpdate.isSaveable = incomingIsSaveable;
    }

    if (!isEqual(prevState.persistedDoc, doc) && !isEqual(prevState.lastKnownDoc, doc)) {
      batchedStateToUpdate.lastKnownDoc = doc;
    }
    const hasIndexPatternsChanged =
      prevState.indexPatternsForTopNav.length !== filterableIndexPatterns.length ||
      filterableIndexPatterns.some(
        (id) => !prevState.indexPatternsForTopNav.find((indexPattern) => indexPattern.id === id)
      );
    // Update the cached index patterns if the user made a change to any of them
    if (hasIndexPatternsChanged) {
      const { indexPatterns } = await getAllIndexPatterns(
        filterableIndexPatterns,
        props.plugins.data.indexPatterns
      );
      if (indexPatterns) {
        batchedStateToUpdate.indexPatternsForTopNav = indexPatterns;
      }
    }
    if (Object.keys(batchedStateToUpdate).length) {
      return batchedStateToUpdate;
    }
  };

  // The frame needs to call onChange every time its internal state changes
  useEffect(
    () => {
      const activeDatasource =
        state.activeDatasourceId && !state.datasourceStates[state.activeDatasourceId].isLoading
          ? props.datasourceMap[state.activeDatasourceId]
          : undefined;

      if (!activeDatasource || !activeVisualization) {
        return;
      }

      const savedObjectFormat = getSavedObjectFormat({
        activeDatasources: Object.keys(state.datasourceStates).reduce(
          (datasourceMap, datasourceId) => ({
            ...datasourceMap,
            [datasourceId]: props.datasourceMap[datasourceId],
          }),
          {}
        ),
        visualization: activeVisualization,
        state,
        framePublicAPI,
      });

      // Frame loader (app or embeddable) is expected to call this when it loads and updates
      // This should be replaced with a top-down state
      getStateToUpdate(savedObjectFormat, {
        isSaveable,
        persistedDoc,
        indexPatternsForTopNav,
        lastKnownDoc,
      }).then((batchedStateToUpdate) => {
        if (batchedStateToUpdate) {
          dispatchChange(batchedStateToUpdate);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeVisualization,
      state.datasourceStates,
      state.visualization,
      activeData,
      query,
      filters,
      savedQuery,
      state.title,
      dispatchChange,
    ]
  );

  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    const { activeDatasourceId, datasourceStates } = state;
    const activeVisualizationId = state.visualization.activeId;
    const visualizationState = state.visualization.state;
    const { visualizationMap, datasourceMap } = props;

    if (!field || !activeDatasourceId) {
      return;
    }

    return getTopSuggestionForField(
      datasourceLayers,
      activeVisualizationId,
      visualizationMap,
      visualizationState,
      datasourceMap[activeDatasourceId],
      datasourceStates,
      field
    );
  };

  const hasSuggestionForField = useCallback(
    (field: DragDropIdentifier) => getSuggestionForField.current!(field) !== undefined,
    [getSuggestionForField]
  );

  const dropOntoWorkspace = useCallback(
    (field) => {
      const suggestion = getSuggestionForField.current!(field);
      if (suggestion) {
        trackUiEvent('drop_onto_workspace');
        switchToSuggestion(dispatch, suggestion, 'SWITCH_VISUALIZATION');
      }
    },
    [getSuggestionForField]
  );

  return (
    <RootDragDropProvider>
      <FrameLayout
        isFullscreen={Boolean(state.isFullscreenDatasource)}
        dataPanel={
          <DataPanelWrapper
            datasourceMap={props.datasourceMap}
            activeDatasource={state.activeDatasourceId}
            datasourceState={
              state.activeDatasourceId
                ? state.datasourceStates[state.activeDatasourceId].state
                : null
            }
            datasourceIsLoading={
              state.activeDatasourceId
                ? state.datasourceStates[state.activeDatasourceId].isLoading
                : true
            }
            dispatch={dispatch}
            core={props.core}
            query={query}
            dateRange={dateRange}
            filters={filters}
            showNoDataPopover={props.showNoDataPopover}
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
            plugins={props.plugins}
          />
        }
        configPanel={
          allLoaded && (
            <ConfigPanelWrapper
              activeDatasourceId={state.activeDatasourceId!}
              datasourceMap={props.datasourceMap}
              datasourceStates={state.datasourceStates}
              visualizationMap={props.visualizationMap}
              activeVisualizationId={state.visualization.activeId}
              dispatch={dispatch}
              visualizationState={state.visualization.state}
              framePublicAPI={framePublicAPI}
              core={props.core}
              isFullscreen={Boolean(state.isFullscreenDatasource)}
            />
          )
        }
        workspacePanel={
          allLoaded && (
            <WorkspacePanel
              title={state.title}
              activeDatasourceId={state.activeDatasourceId}
              activeVisualizationId={state.visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={state.datasourceStates}
              framePublicAPI={framePublicAPI}
              visualizationState={state.visualization.state}
              visualizationMap={props.visualizationMap}
              dispatch={dispatch}
              isFullscreen={Boolean(state.isFullscreenDatasource)}
              ExpressionRenderer={props.ExpressionRenderer}
              core={props.core}
              plugins={props.plugins}
              visualizeTriggerFieldContext={visualizeTriggerFieldContext}
              getSuggestionForField={getSuggestionForField.current}
            />
          )
        }
        suggestionsPanel={
          allLoaded && (
            <SuggestionPanel
              frame={framePublicAPI}
              activeDatasourceId={state.activeDatasourceId}
              activeVisualizationId={state.visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={state.datasourceStates}
              visualizationState={state.visualization.state}
              visualizationMap={props.visualizationMap}
              dispatch={dispatch}
              ExpressionRenderer={props.ExpressionRenderer}
              stagedPreview={state.stagedPreview}
              plugins={props.plugins}
            />
          )
        }
      />
    </RootDragDropProvider>
  );
}
