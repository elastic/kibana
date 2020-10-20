/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useState } from 'react';
import { CoreSetup, CoreStart } from 'kibana/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { Datasource, FramePublicAPI, Visualization } from '../../types';
import { reducer, getInitialState } from './state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';
import { WorkspacePanel } from './workspace_panel';
import { Document } from '../../persistence/saved_object_store';
import { RootDragDropProvider } from '../../drag_drop';
import { getSavedObjectFormat } from './save';
import { generateId } from '../../id_generator';
import { Filter, Query, SavedQuery } from '../../../../../../src/plugins/data/public';
import { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public';
import { EditorFrameStartPlugins } from '../service';
import { initializeDatasources, createDatasourceLayers } from './state_helpers';
import { applyVisualizeFieldSuggestions } from './suggestion_helpers';

export interface EditorFrameProps {
  doc?: Document;
  datasourceMap: Record<string, Datasource>;
  visualizationMap: Record<string, Visualization>;
  initialDatasourceId: string | null;
  initialVisualizationId: string | null;
  ExpressionRenderer: ReactExpressionRendererType;
  onError: (e: { message: string }) => void;
  core: CoreSetup | CoreStart;
  plugins: EditorFrameStartPlugins;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  onChange: (arg: {
    filterableIndexPatterns: string[];
    doc: Document;
    isSaveable: boolean;
  }) => void;
  showNoDataPopover: () => void;
  initialContext?: VisualizeFieldContext;
}

export function EditorFrame(props: EditorFrameProps) {
  const [state, dispatch] = useReducer(reducer, props, getInitialState);
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
          props.doc?.references,
          visualizeTriggerFieldContext
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
    dateRange: props.dateRange,
    query: props.query,
    filters: props.filters,

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
          newState: layerIds.reduce(
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
      if (props.doc) {
        dispatch({
          type: 'VISUALIZATION_LOADED',
          doc: {
            ...props.doc,
            state: {
              ...props.doc.state,
              visualization: props.doc.visualizationType
                ? props.visualizationMap[props.doc.visualizationType].initialize(
                    framePublicAPI,
                    props.doc.state.visualization
                  )
                : props.doc.state.visualization,
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
    [props.doc]
  );

  // Initialize visualization as soon as all datasources are ready
  useEffect(
    () => {
      if (allLoaded && state.visualization.state === null && activeVisualization) {
        const initialVisualizationState = activeVisualization.initialize(framePublicAPI);
        dispatch({
          type: 'UPDATE_VISUALIZATION_STATE',
          visualizationId: activeVisualization.id,
          newState: initialVisualizationState,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLoaded, activeVisualization, state.visualization.state]
  );

  // Get suggestions for visualize field when all datasources are ready
  useEffect(() => {
    if (allLoaded && visualizeTriggerFieldContext && !props.doc) {
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

      props.onChange(
        getSavedObjectFormat({
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
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeVisualization,
      state.datasourceStates,
      state.visualization,
      props.query,
      props.dateRange,
      props.filters,
      props.savedQuery,
      state.title,
    ]
  );

  return (
    <RootDragDropProvider>
      <FrameLayout
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
            query={props.query}
            dateRange={props.dateRange}
            filters={props.filters}
            showNoDataPopover={props.showNoDataPopover}
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
              ExpressionRenderer={props.ExpressionRenderer}
              core={props.core}
              plugins={props.plugins}
              visualizeTriggerFieldContext={visualizeTriggerFieldContext}
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
