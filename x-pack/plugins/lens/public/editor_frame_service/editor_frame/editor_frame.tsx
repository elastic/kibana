/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useRef } from 'react';
import type { CoreStart } from '../../../../../../src/core/public/types';
import type { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public/react_expression_renderer';
import { RootDragDropProvider } from '../../drag_drop/providers/providers';
import type { DragDropIdentifier } from '../../drag_drop/providers/types';
import { trackUiEvent } from '../../lens_ui_telemetry/factory';
import { useLensDispatch, useLensSelector } from '../../state_management';
import {
  selectActiveDatasourceId,
  selectAreDatasourcesLoaded,
  selectDatasourceStates,
  selectFramePublicAPI,
  selectVisualization,
} from '../../state_management/selectors';
import type { DatasourceMap, FramePublicAPI, VisualizationMap } from '../../types';
import type { EditorFrameStartPlugins } from '../service';
import { ConfigPanelWrapper } from './config_panel/config_panel';
import { DataPanelWrapper } from './data_panel_wrapper';
import { FrameLayout } from './frame_layout';
import type { Suggestion } from './suggestion_helpers';
import { getTopSuggestionForField, switchToSuggestion } from './suggestion_helpers';
import { SuggestionPanelWrapper } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel/workspace_panel';

export interface EditorFrameProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
}

export function EditorFrame(props: EditorFrameProps) {
  const { datasourceMap, visualizationMap } = props;
  const dispatchLens = useLensDispatch();
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const visualization = useLensSelector(selectVisualization);
  const allLoaded = useLensSelector(selectAreDatasourcesLoaded);
  const framePublicAPI: FramePublicAPI = useLensSelector((state) =>
    selectFramePublicAPI(state, datasourceMap)
  );
  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    if (!field || !activeDatasourceId) {
      return;
    }
    return getTopSuggestionForField(
      framePublicAPI.datasourceLayers,
      visualization,
      datasourceStates,
      visualizationMap,
      datasourceMap[activeDatasourceId],
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
        dataPanel={
          <DataPanelWrapper
            core={props.core}
            plugins={props.plugins}
            datasourceMap={datasourceMap}
            showNoDataPopover={props.showNoDataPopover}
            dropOntoWorkspace={dropOntoWorkspace}
            hasSuggestionForField={hasSuggestionForField}
          />
        }
        configPanel={
          allLoaded && (
            <ConfigPanelWrapper
              core={props.core}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              framePublicAPI={framePublicAPI}
            />
          )
        }
        workspacePanel={
          allLoaded && (
            <WorkspacePanel
              core={props.core}
              plugins={props.plugins}
              ExpressionRenderer={props.ExpressionRenderer}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              framePublicAPI={framePublicAPI}
              getSuggestionForField={getSuggestionForField.current}
            />
          )
        }
        suggestionsPanel={
          allLoaded && (
            <SuggestionPanelWrapper
              ExpressionRenderer={props.ExpressionRenderer}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              frame={framePublicAPI}
            />
          )
        }
      />
    </RootDragDropProvider>
  );
}
