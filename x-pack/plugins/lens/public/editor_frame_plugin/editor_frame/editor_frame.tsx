/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { Datasource, Visualization } from '../../types';
import { reducer, getInitialState } from '../state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanel } from './suggestion_panel';

export interface EditorFrameProps {
  datasources: Record<string, Datasource>;
  visualizations: Record<string, Visualization>;

  initialDatasource: string | null;
  initialVisualization: string | null;
}

export function EditorFrame(props: EditorFrameProps) {
  const [state, dispatch] = useReducer(reducer, props, getInitialState);

  // Initialize current datasource
  useEffect(
    () => {
      let datasourceGotSwitched = false;
      if (state.datasourceIsLoading && state.activeDatasource) {
        props.datasources[state.activeDatasource].initialize().then(datasourceState => {
          if (!datasourceGotSwitched) {
            dispatch({
              type: 'UPDATE_DATASOURCE_STATE',
              newState: datasourceState,
            });
          }
        });

        return () => {
          datasourceGotSwitched = true;
        };
      }
    },
    [state.activeDatasource, state.datasourceIsLoading]
  );

  const datasourcePublicAPI = useMemo(
    () =>
      state.activeDatasource && !state.datasourceIsLoading
        ? props.datasources[state.activeDatasource].getPublicAPI(
            state.datasourceState,
            (newState: unknown) => {
              dispatch({
                type: 'UPDATE_DATASOURCE_STATE',
                newState,
              });
            }
          )
        : undefined,
    [props.datasources, state.datasourceIsLoading, state.activeDatasource, state.datasourceState]
  );

  if (state.activeDatasource && !state.datasourceIsLoading) {
    return (
      <FrameLayout
        dataPanel={
          <DataPanelWrapper
            datasources={props.datasources}
            activeDatasource={state.activeDatasource}
            datasourceState={state.datasourceState}
            datasourceIsLoading={state.datasourceIsLoading}
            dispatch={dispatch}
          />
        }
        configPanel={
          <ConfigPanelWrapper
            visualizations={props.visualizations}
            activeVisualization={state.activeVisualization}
            visualizationState={state.visualizationState}
            datasourcePublicAPI={datasourcePublicAPI!}
            dispatch={dispatch}
          />
        }
        suggestionsPanel={
          <SuggestionPanel
            activeDatasource={props.datasources[state.activeDatasource]}
            activeVisualizationId={state.activeVisualization}
            datasourcePublicAPI={datasourcePublicAPI!}
            datasourceState={state.datasourceState}
            visualizationState={
              state.activeVisualization && state.visualizationState[state.activeVisualization]
            }
            visualizations={props.visualizations}
            dispatch={dispatch}
          />
        }
      />
    );
  } else {
    return (
      <FrameLayout
        dataPanel={
          <DataPanelWrapper
            activeDatasource={state.activeDatasource}
            datasourceIsLoading={state.datasourceIsLoading}
            datasourceState={state.datasourceState}
            datasources={props.datasources}
            dispatch={dispatch}
          />
        }
        configPanel={null}
        suggestionsPanel={null}
      />
    );
  }
}
