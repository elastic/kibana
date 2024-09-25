/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { CoreStart } from '@kbn/core/public';
import { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import { type DragDropAction, DragDropIdentifier, RootDragDropProvider } from '@kbn/dom-drag-drop';
import { getAbsoluteDateRange } from '../../utils';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import {
  DatasourceMap,
  FramePublicAPI,
  VisualizationMap,
  Suggestion,
  UserMessagesGetter,
  AddUserMessages,
} from '../../types';
import { DataPanelWrapper } from './data_panel_wrapper';
import { BannerWrapper } from './banner_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanelWrapper } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
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
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
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

  framePublicAPI.absDateRange = getAbsoluteDateRange(
    props.plugins.data.query.timefilter.timefilter
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
      framePublicAPI.dataViews,
      true
    );
  };

  const hasSuggestionForField = useCallback(
    (field: DragDropIdentifier) => getSuggestionForField.current!(field) !== undefined,
    [getSuggestionForField]
  );

  const dropOntoWorkspace = useCallback(
    (field: DragDropIdentifier) => {
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

  const bannerMessages = props.getUserMessages('banner', { severity: 'warning' });

  const telemetryMiddleware = useCallback((action: DragDropAction) => {
    if (action.type === 'dropToTarget') {
      trackUiCounterEvents('drop_total');
    }
  }, []);

  return (
    <RootDragDropProvider
      initialState={{ dataTestSubjPrefix: 'lnsDragDrop' }}
      customMiddleware={telemetryMiddleware}
    >
      <FrameLayout
        bannerMessages={
          bannerMessages.length ? (
            <ErrorBoundary onError={onError}>
              <BannerWrapper
                nodes={bannerMessages.map(({ longMessage }) => longMessage as React.ReactNode)}
              />
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
                dataViews={props.plugins.dataViews}
                indexPatternService={props.indexPatternService}
                getUserMessages={props.getUserMessages}
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
                getUserMessages={props.getUserMessages}
                addUserMessages={props.addUserMessages}
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
                getUserMessages={props.getUserMessages}
                nowProvider={props.plugins.data.nowProvider}
                core={props.core}
                showOnlyIcons
              />
            </ErrorBoundary>
          )
        }
      />
    </RootDragDropProvider>
  );
}
