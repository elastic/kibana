/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect } from 'react';
import { Datasource, Visualization } from '../types';

interface EditorFrameProps {
  datasources: { [key: string]: Datasource };
  visualizations: { [key: string]: Visualization };

  initialDatasource?: string;
}

interface DatasourceState {
  datasourceName: string;
  visualizationName: string;

  datasourceState: any;
  visualizationState: any;
}

interface UpdateDatasourceAction {
  type: 'UPDATE_DATASOURCE';
  payload: any;
}

interface UpdateVisualizationAction {
  type: 'UPDATE_VISUALIZATION';
  payload: any;
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

      <div
        ref={domElement => {
          if (domElement) {
            props.datasources[state.datasourceName].renderDataPanel(domElement, {
              state: state.datasourceState,
              setState: newState =>
                dispatch({
                  type: 'UPDATE_DATASOURCE',
                  payload: newState,
                }),
            });
          }
        }}
      />

      <div
        ref={domElement => {
          if (domElement) {
            props.visualizations[state.visualizationName].renderConfigPanel(domElement, {
              datasource: props.datasources[state.datasourceName].getPublicAPI(
                state.datasourceState,
                newState =>
                  dispatch({
                    type: 'UPDATE_DATASOURCE',
                    payload: newState,
                  })
              ),
              state: state.visualizationState,
              setState: newState =>
                dispatch({
                  type: 'UPDATE_VISUALIZATION',
                  payload: newState,
                }),
            });
          }
        }}
      />
    </div>
  );
}
