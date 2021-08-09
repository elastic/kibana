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
import { SuggestionPanelWrapper } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { DragDropIdentifier, RootDragDropProvider } from '../../drag_drop';
import { EditorFrameStartPlugins } from '../service';
import { createDatasourceLayers } from './state_helpers';
import { getTopSuggestionForField, switchToSuggestion, Suggestion } from './suggestion_helpers';
import { trackUiEvent } from '../../lens_ui_telemetry';
import {
  useLensSelector,
  useLensDispatch,
  selectDatasourceLayers,
  selectAreDatasourcesLoaded,
} from '../../state_management';

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
  const { activeData, activeDatasourceId, datasourceStates, visualization } = useLensSelector(
    (state) => state.lens
  );
  const allLoaded = useLensSelector(selectAreDatasourcesLoaded);
  const datasourceLayers = useLensSelector((state) => selectDatasourceLayers(state, datasourceMap));

  const framePublicAPI: FramePublicAPI = useMemo(() => ({ datasourceLayers, activeData }), [
    activeData,
    datasourceLayers,
  ]);

  // Using a ref to prevent rerenders in the child components while keeping the latest state
  const getSuggestionForField = useRef<(field: DragDropIdentifier) => Suggestion | undefined>();
  getSuggestionForField.current = (field: DragDropIdentifier) => {
    if (!field || !activeDatasourceId) {
      return;
    }
    return getTopSuggestionForField(
      datasourceLayers,
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
