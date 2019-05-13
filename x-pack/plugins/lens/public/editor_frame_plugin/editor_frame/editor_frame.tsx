/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import {
  Datasource,
  Visualization,
  TableColumn,
  DatasourceSuggestion,
  DimensionRole,
} from '../../types';
import { reducer, getInitialState } from '../state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';
import { FrameLayout } from './frame_layout';
import { SuggestionPanelWrapper } from './suggestion_panel_wrapper';

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

  const datasourceIsActive = Boolean(state.activeDatasource && !state.datasourceIsLoading);

  if (datasourceIsActive) {
    const suggestions =
      state.activeDatasource && !state.datasourceIsLoading
        ? getSuggestions(
            props.datasources[state.activeDatasource].getDatasourceSuggestionsFromCurrentState(
              state.activeDatasource
            ),
            props.visualizations,
            state.activeVisualization
              ? props.visualizations[state.activeVisualization].getMappingOfTableToRoles(
                  state.visualizationState[state.activeVisualization],
                  datasourcePublicAPI!
                )
              : []
          )
        : [];

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
        configPanel={
          <ConfigPanelWrapper
            visualizations={props.visualizations}
            activeVisualization={state.activeVisualization}
            datasourcePublicAPI={datasourcePublicAPI!}
            dispatch={dispatch}
            visualizationState={state.visualizationState}
          />
        }
        suggestionsPanel={<SuggestionPanelWrapper suggestions={suggestions} dispatch={dispatch} />}
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

function getSuggestions(
  datasourceTableSuggestions: DatasourceSuggestion[],
  visualizations: Record<string, Visualization>,
  currentColumnRoles: DimensionRole[]
) {
  return (
    Object.entries(visualizations)
      .map(([visualizationId, visualization]) => {
        const datasourceTableMetas: Record<string, TableColumn[]> = {};
        datasourceTableSuggestions.map(({ tableColumns }, datasourceSuggestionId) => {
          datasourceTableMetas[datasourceSuggestionId] = tableColumns;
        });
        return visualization
          .getSuggestions({
            tableColumns: datasourceTableMetas,
            roles: currentColumnRoles,
          })
          .map(({ datasourceSuggestionId, ...suggestion }) => ({
            ...suggestion,
            visualizationId,
            datasourceState: datasourceTableSuggestions[datasourceSuggestionId].state,
          }));
      })
      // TODO why is flatMap not available here?
      .reduce((globalList, currentList) => [...globalList, ...currentList], [])
      .sort(({ score: scoreA }, { score: scoreB }) => scoreB - scoreA)
  );
}
