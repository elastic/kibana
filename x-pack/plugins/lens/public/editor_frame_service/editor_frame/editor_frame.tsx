/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { CoreStart } from 'kibana/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { DatasourceMap, FramePublicAPI, VisualizationMap } from '../../types';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { DragDropIdentifier, RootDragDropProvider } from '../../drag_drop';
import { EditorFrameStartPlugins } from '../service';
import { createDatasourceLayers } from './state_helpers';
import { getTopSuggestionForField, switchToSuggestion, Suggestion } from './suggestion_helpers';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { useLensSelector, useLensDispatch } from '../../state_management';

export interface EditorFrameProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
}

export function EditorFrame(props: EditorFrameProps) {
  const {
    activeData,
    resolvedDateRange: dateRange,
    query,
    filters,
    searchSessionId,
    activeDatasourceId,
    visualization,
    datasourceStates,
    stagedPreview,
    isFullscreenDatasource,
  } = useLensSelector((state) => state.lens);

  const dispatchLens = useLensDispatch();

  const allLoaded = Object.values(datasourceStates).every(({ isLoading }) => isLoading === false);

  const datasourceLayers = React.useMemo(
    () => createDatasourceLayers(props.datasourceMap, datasourceStates),
    [props.datasourceMap, datasourceStates]
  );

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
            core={props.core}
            plugins={props.plugins}
            showNoDataPopover={props.showNoDataPopover}
            activeDatasource={activeDatasourceId}
            datasourceState={activeDatasourceId ? datasourceStates[activeDatasourceId].state : null}
            datasourceIsLoading={
              activeDatasourceId ? datasourceStates[activeDatasourceId].isLoading : true
            }
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
          />
        }
        configPanel={
          allLoaded && (
            <ConfigPanelWrapper
              activeVisualization={
                visualization.activeId ? props.visualizationMap[visualization.activeId] : null
              }
              activeDatasourceId={activeDatasourceId!}
              datasourceMap={props.datasourceMap}
              datasourceStates={datasourceStates}
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
              getSuggestionForField={getSuggestionForField.current}
            />
          )
        }
        suggestionsPanel={
          allLoaded &&
          !isFullscreenDatasource && (
            <SuggestionPanel
              visualizationMap={props.visualizationMap}
              datasourceMap={props.datasourceMap}
              ExpressionRenderer={props.ExpressionRenderer}
              stagedPreview={stagedPreview}
              frame={framePublicAPI}
              activeVisualizationId={visualization.activeId}
              activeDatasourceId={activeDatasourceId}
              datasourceStates={datasourceStates}
              visualizationState={visualization.state}
            />
          )
        }
      />
    </RootDragDropProvider>
  );
}
