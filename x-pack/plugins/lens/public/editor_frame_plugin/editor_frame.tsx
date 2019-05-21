/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect } from 'react';
import { Datasource, Visualization } from '../types';
import { NativeRenderer } from '../native_renderer';

interface EditorFrameProps {
  datasources: { [key: string]: Datasource };
  visualizations: { [key: string]: Visualization };

  initialDatasource?: string;
}

interface DatasourceState {
  datasourceName: string;
  visualizationName: string;

  datasourceState: unknown;
  visualizationState: unknown;
}

interface UpdateDatasourceAction {
  type: 'UPDATE_DATASOURCE';
  payload: unknown;
}

interface UpdateVisualizationAction {
  type: 'UPDATE_VISUALIZATION';
  payload: unknown;
}

type Action = UpdateDatasourceAction | UpdateVisualizationAction;

function stateReducer(state: DatasourceState, action: Action): DatasourceState {
  switch (action.type) {
    case 'UPDATE_DATASOURCE':
      return {
        ...state,
        datasourceState: action.payload,
      };
    case 'UPDATE_VISUALIZATION':
      return {
        ...state,
        visualizationState: action.payload,
      };
  }
  return state;
}

export function EditorFrame(props: EditorFrameProps) {
  const dsKeys = Object.keys(props.datasources);
  const vKeys = Object.keys(props.visualizations);

  const [state, dispatch] = useReducer(stateReducer, {
    datasourceName: props.initialDatasource || dsKeys[0],
    visualizationName: vKeys[0],

    datasourceState: null,
    visualizationState: null,
  });

  useEffect(() => {
    const vState = props.visualizations[state.visualizationName].initialize();
    props.datasources[state.datasourceName].initialize().then(dsState => {
      dispatch({
        type: 'UPDATE_DATASOURCE',
        payload: dsState,
      });
    });

    dispatch({
      type: 'UPDATE_VISUALIZATION',
      payload: vState,
    });
  }, []);

  return (
    <div>
      <h2>Editor Frame</h2>

      <NativeRenderer
        render={props.datasources[state.datasourceName].renderDataPanel}
        nativeProps={{
          state: state.datasourceState,
          setState: (newState: unknown) =>
            dispatch({
              type: 'UPDATE_DATASOURCE',
              payload: newState,
            }),
        }}
      />

      <NativeRenderer
        render={props.visualizations[state.visualizationName].renderConfigPanel}
        nativeProps={{
          datasource: props.datasources[state.datasourceName].getPublicAPI(
            state.datasourceState,
            newState =>
              dispatch({
                type: 'UPDATE_DATASOURCE',
                payload: newState,
              })
          ),
          state: state.visualizationState,
          setState: (newState: unknown) =>
            dispatch({
              type: 'UPDATE_VISUALIZATION',
              payload: newState,
            }),
        }}
      />
    </div>
  );
}
