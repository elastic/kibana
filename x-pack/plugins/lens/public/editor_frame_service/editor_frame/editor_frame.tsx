/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { DatasourceMap, FramePublicAPI, VisualizationMap, Suggestion } from '../../types';
import { DataPanelWrapper } from './data_panel_wrapper';
import { BannerWrapper } from './banner_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanelWrapper } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { DragDropIdentifier, RootDragDropProvider } from '../../drag_drop';
import { EditorFrameStartPlugins } from '../service';
import { getTopSuggestionForField, switchToSuggestion } from './suggestion_helpers';
import {
  useLensSelector,
  useLensDispatch,
  selectAreDatasourcesLoaded,
  selectFramePublicAPI,
  selectActiveDatasourceId,
  selectDatasourceStates,
  selectVisualization,
} from '../../state_management';
import type { LensInspector } from '../../lens_inspector_service';
import { ErrorBoundary, showMemoizedErrorNotification } from '../../lens_ui_errors';
import { IndexPatternServiceAPI } from '../../data_views_service/service';

export interface EditorFrameProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart;
  plugins: EditorFrameStartPlugins;
  showNoDataPopover: () => void;
  lensInspector: LensInspector;
  indexPatternService: IndexPatternServiceAPI;
}

export function EditorFrame(props: EditorFrameProps) {
  const { datasourceMap, visualizationMap } = props;
  const dispatchLens = useLensDispatch();
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const visualization = useLensSelector(selectVisualization);
  const areDatasourcesLoaded = useLensSelector(selectAreDatasourcesLoaded);
  const isVisualizationLoaded = !!visualization.state;
  const visualizationTypeIsKnown = Boolean(
    visualization.activeId && props.visualizationMap[visualization.activeId]
  );

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
      field,
      framePublicAPI.dataViews
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
        trackUiCounterEvents('drop_onto_workspace');
        switchToSuggestion(dispatchLens, suggestion, { clearStagedPreview: true });
      }
    },
    [getSuggestionForField, dispatchLens]
  );

  const onError = useCallback((error: Error) => {
    showMemoizedErrorNotification(error);
  }, []);

  const bannerMessages: React.ReactNode[] | undefined = useMemo(() => {
    if (activeDatasourceId) {
      return datasourceMap[activeDatasourceId].getDeprecationMessages?.(
        datasourceStates[activeDatasourceId].state
      );
    }
  }, [activeDatasourceId, datasourceMap, datasourceStates]);

  return (
    <RootDragDropProvider>
      <FrameLayout
        bannerMessages={
          bannerMessages ? (
            <ErrorBoundary onError={onError}>
              <BannerWrapper nodes={bannerMessages} />
            </ErrorBoundary>
          ) : undefined
        }
        dataPanel={
          <ErrorBoundary onError={onError}>
            <DataPanelWrapper
              core={props.core}
              plugins={props.plugins}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              showNoDataPopover={props.showNoDataPopover}
              dropOntoWorkspace={dropOntoWorkspace}
              hasSuggestionForField={hasSuggestionForField}
              indexPatternService={props.indexPatternService}
              frame={framePublicAPI}
            />
          </ErrorBoundary>
        }
        configPanel={
          areDatasourcesLoaded && (
            <ErrorBoundary onError={onError}>
              <ConfigPanelWrapper
                core={props.core}
                datasourceMap={datasourceMap}
                visualizationMap={visualizationMap}
                framePublicAPI={framePublicAPI}
                uiActions={props.plugins.uiActions}
                indexPatternService={props.indexPatternService}
              />
            </ErrorBoundary>
          )
        }
        workspacePanel={
          areDatasourcesLoaded &&
          isVisualizationLoaded && (
            <ErrorBoundary onError={onError}>
              <WorkspacePanel
                core={props.core}
                plugins={props.plugins}
                ExpressionRenderer={props.ExpressionRenderer}
                lensInspector={props.lensInspector}
                datasourceMap={datasourceMap}
                visualizationMap={visualizationMap}
                framePublicAPI={framePublicAPI}
                getSuggestionForField={getSuggestionForField.current}
              />
            </ErrorBoundary>
          )
        }
        suggestionsPanel={
          visualizationTypeIsKnown &&
          areDatasourcesLoaded && (
            <ErrorBoundary onError={onError}>
              <SuggestionPanelWrapper
                ExpressionRenderer={props.ExpressionRenderer}
                datasourceMap={datasourceMap}
                visualizationMap={visualizationMap}
                frame={framePublicAPI}
              />
            </ErrorBoundary>
          )
        }
      />
    </RootDragDropProvider>
  );
}
