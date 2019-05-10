/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { EuiSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Datasource, Visualization, DatasourceDataPanelProps } from '../../types';
import { NativeRenderer } from '../../native_renderer';
import { reducer, getInitialState } from '../state_management';
import { DataPanelWrapper } from './data_panel_wrapper';
import { ConfigPanelWrapper } from './config_panel_wrapper';

export interface EditorFrameProps {
  datasources: { [key: string]: Datasource };
  visualizations: { [key: string]: Visualization };

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

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <DataPanelWrapper
          activeDatasource={state.activeDatasource}
          datasourceIsLoading={state.datasourceIsLoading}
          datasourceState={state.datasourceState}
          datasources={props.datasources}
          dispatch={dispatch}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {state.activeDatasource && !state.datasourceIsLoading && (
          <ConfigPanelWrapper
            visualizations={props.visualizations}
            activeVisualization={state.activeVisualization}
            datasourcePublicAPI={datasourcePublicAPI!}
            dispatch={dispatch}
            visualizationState={state.visualizationState}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
