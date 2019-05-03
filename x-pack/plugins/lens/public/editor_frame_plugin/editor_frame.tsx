/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useReducer, useMemo } from 'react';
import { EuiSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Datasource, Visualization, DatasourceDataPanelProps } from '../types';
import { NativeRenderer } from '../native_renderer';
import { reducer, getInitialState } from './state_management';

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

  const datasourceStateUpdater = useMemo(
    () => (newState: unknown) => {
      dispatch({
        type: 'UPDATE_DATASOURCE_STATE',
        newState,
      });
    },
    [dispatch]
  );

  const visualizationStateUpdater = useMemo(
    () => (newState: unknown) => {
      dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        newState,
      });
    },
    [dispatch]
  );

  const datasourcePublicAPI = useMemo(
    () =>
      state.activeDatasource && !state.datasourceIsLoading
        ? props.datasources[state.activeDatasource].getPublicAPI(
            state.datasourceState,
            datasourceStateUpdater
          )
        : undefined,
    [
      props.datasources,
      state.datasourceIsLoading,
      state.activeDatasource,
      datasourceStateUpdater,
      state.datasourceState,
    ]
  );

  function renderDatasource() {
    const datasourceProps: DatasourceDataPanelProps = {
      state: state.datasourceState,
      setState: datasourceStateUpdater,
    };

    return (
      <>
        <EuiSelect
          data-test-subj="datasource-switch"
          options={Object.keys(props.datasources).map(datasourceId => ({
            value: datasourceId,
            text: datasourceId,
          }))}
          value={state.activeDatasource || undefined}
          onChange={e => {
            dispatch({ type: 'SWITCH_DATASOURCE', newDatasourceId: e.target.value });
          }}
        />
        {state.activeDatasource && !state.datasourceIsLoading && (
          <NativeRenderer
            render={props.datasources[state.activeDatasource].renderDataPanel}
            nativeProps={datasourceProps}
          />
        )}
      </>
    );
  }

  function renderVisualization() {
    return (
      <>
        <EuiSelect
          data-test-subj="visualization-switch"
          options={Object.keys(props.visualizations).map(visualizationId => ({
            value: visualizationId,
            text: visualizationId,
          }))}
          value={state.activeDatasource || undefined}
          onChange={e => {
            dispatch({
              type: 'SWITCH_VISUALIZATION',
              newVisulizationId: e.target.value,
              // TODO we probably want to have a separate API to "force" a visualization switch
              // which isn't a result of a picked suggestion
              initialState: props.visualizations[e.target.value].initialize(),
            });
          }}
        />
        {state.activeVisualization && state.activeDatasource && !state.datasourceIsLoading && (
          <NativeRenderer
            render={props.visualizations[state.activeVisualization].renderConfigPanel}
            nativeProps={{
              state: state.visualizationState[state.activeVisualization],
              setState: visualizationStateUpdater,
              datasource: datasourcePublicAPI!,
            }}
          />
        )}
      </>
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>{renderDatasource()}</EuiFlexItem>
      <EuiFlexItem>{renderVisualization()}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
