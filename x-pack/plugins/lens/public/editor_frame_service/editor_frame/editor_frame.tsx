/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, useState, useCallback, useRef, useMemo } from 'react';
import { CoreStart } from 'kibana/public';
import { isEqual } from 'lodash';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import { getAllIndexPatterns } from '../../utils';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { Datasource, FramePublicAPI, Visualization } from '../../types';
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
  getVisualizeFieldSuggestions,
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
  updateLayer,
  visualizationLoaded,
  updateVisualizationState,
  updateDatasourceState,
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
  const lensState = useLensSelector((state) => state.app);
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
    title,
    description,
    persistedId,
    activeDatasourceId,
    isFullscreenDatasource,
    visualization,
    datasourceStates,
    stagedPreview,
  } = lensState;

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
    visualization.activeId && props.visualizationMap[visualization.activeId];

  const allLoaded = Object.values(datasourceStates).every(
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
          datasourceStates,
          persistedDoc?.references,
          visualizeTriggerFieldContext,
          { isFullEditor: true }
        )
          .then((result) => {
            if (!isUnmounted) {
              Object.entries(result).forEach(([datasourceId, { state: datasourceState }]) => {
                dispatchLens(
                  updateDatasourceState({
                    updater: datasourceState,
                    datasourceId,
                  })
                );
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
  const datasourceLayers = createDatasourceLayers(props.datasourceMap, datasourceStates);

  const framePublicAPI: FramePublicAPI = useMemo(
    () => ({
      datasourceLayers,
      activeData,
      dateRange,
      query,
      filters,
      searchSessionId,
    }),
    [activeData, datasourceLayers, dateRange, query, filters, searchSessionId]
  );

  useEffect(
    () => {
      if (persistedDoc) {
        dispatchLens(
          visualizationLoaded({
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
          })
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistedDoc]
  );

  // Initialize visualization as soon as all datasources are ready
  useEffect(
    () => {
      if (allLoaded && visualization.state === null && activeVisualization) {
        const initialVisualizationState = activeVisualization.initialize(framePublicAPI);
        dispatchLens(
          updateVisualizationState({
            visualizationId: activeVisualization.id,
            updater: initialVisualizationState,
          })
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLoaded, activeVisualization, visualization.state]
  );

  // Get suggestions for visualize field when all datasources are ready
  useEffect(() => {
    if (allLoaded && visualizeTriggerFieldContext && !persistedDoc) {
      const selectedSuggestion = getVisualizeFieldSuggestions({
        datasourceMap: props.datasourceMap,
        datasourceStates,
        visualizationMap: props.visualizationMap,
        activeVisualizationId: visualization.activeId,
        visualizationState: visualization.state,
        visualizeTriggerFieldContext,
      });
      if (selectedSuggestion) {
        switchToSuggestion(dispatchLens, selectedSuggestion, 'SWITCH_VISUALIZATION');
      }
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
        activeDatasourceId && !datasourceStates[activeDatasourceId].isLoading
          ? props.datasourceMap[activeDatasourceId]
          : undefined;

      if (!activeDatasource || !activeVisualization) {
        return;
      }

      const savedObjectFormat = getSavedObjectFormat({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (datasourceMap, datasourceId) => ({
            ...datasourceMap,
            [datasourceId]: props.datasourceMap[datasourceId],
          }),
          {}
        ),
        visualization: activeVisualization,
        state: { datasourceStates, visualization },
        framePublicAPI,
        title,
        description,
        persistedId,
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
      datasourceStates,
      visualization,
      title,
      activeData,
      query,
      filters,
      savedQuery,
      dispatchChange,
    ]
  );

  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    const activeVisualizationId = visualization.activeId;
    const visualizationState = visualization.state;
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
        switchToSuggestion(dispatchLens, suggestion, 'SWITCH_VISUALIZATION');
      }
    },
    [getSuggestionForField, dispatchLens]
  );

  return (
    <RootDragDropProvider>
      <FrameLayout
        isFullscreen={Boolean(isFullscreenDatasource)}
        dataPanel={
          <DataPanelWrapper
            datasourceMap={props.datasourceMap}
            activeDatasource={activeDatasourceId}
            datasourceState={activeDatasourceId ? datasourceStates[activeDatasourceId].state : null}
            datasourceIsLoading={
              activeDatasourceId ? datasourceStates[activeDatasourceId].isLoading : true
            }
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
              activeDatasourceId={activeDatasourceId!}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              visualizationMap={props.visualizationMap}
              activeVisualizationId={visualization.activeId}
              visualizationState={visualization.state}
              framePublicAPI={framePublicAPI}
              core={props.core}
              isFullscreen={Boolean(isFullscreenDatasource)}
            />
          )
        }
        workspacePanel={
          allLoaded && (
            <WorkspacePanel
              title={title}
              activeDatasourceId={activeDatasourceId}
              activeVisualizationId={visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              framePublicAPI={framePublicAPI}
              visualizationState={visualization.state}
              visualizationMap={props.visualizationMap}
              isFullscreen={Boolean(isFullscreenDatasource)}
              ExpressionRenderer={props.ExpressionRenderer}
              core={props.core}
              plugins={props.plugins}
              visualizeTriggerFieldContext={visualizeTriggerFieldContext}
              getSuggestionForField={getSuggestionForField.current}
            />
          )
        }
        suggestionsPanel={
          allLoaded &&
          !state.isFullscreenDatasource && (
            <SuggestionPanel
              frame={framePublicAPI}
              activeDatasourceId={activeDatasourceId}
              activeVisualizationId={visualization.activeId}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
              visualizationState={visualization.state}
              visualizationMap={props.visualizationMap}
              ExpressionRenderer={props.ExpressionRenderer}
              stagedPreview={stagedPreview}
              plugins={props.plugins}
            />
          )
        }
      />
    </RootDragDropProvider>
  );
}
