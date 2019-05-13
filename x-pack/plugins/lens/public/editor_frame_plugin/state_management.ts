/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EditorFrameProps } from './editor_frame';

export interface EditorFrameState {
  activeDatasource: string | null;
  datasourceState: unknown;
  datasourceIsLoading: boolean;

  activeVisualization: string | null;
  visualizationState: {
    [visualizationId: string]: unknown;
  };
}

export type Action =
  | {
      type: 'UPDATE_DATASOURCE_STATE';
      newState: unknown;
    }
  | {
      type: 'UPDATE_VISUALIZATION_STATE';
      newState: unknown;
    }
  | {
      type: 'SWITCH_VISUALIZATION';
      newVisulizationId: string;
      initialState: unknown;
      datasourceState?: unknown;
    }
  | {
      type: 'SWITCH_DATASOURCE';
      newDatasourceId: string;
    };

export const getInitialState = (props: EditorFrameProps) => {
  return {
    datasourceState: null,
    datasourceIsLoading: Boolean(props.initialDatasource),
    activeDatasource: props.initialDatasource,
    visualizationState: props.initialVisualization
      ? {
          [props.initialVisualization]: props.visualizations[
            props.initialVisualization
          ].initialize(),
        }
      : {},
    activeVisualization: props.initialVisualization,
  };
};

export const reducer = (state: EditorFrameState, action: Action): EditorFrameState => {
  switch (action.type) {
    case 'SWITCH_DATASOURCE':
      return {
        ...state,
        activeDatasource: action.newDatasourceId,
        // purge all visualizations on datasource switch
        visualizationState: {},
        activeVisualization: null,
        datasourceState: null,
        datasourceIsLoading: true,
      };
    case 'SWITCH_VISUALIZATION':
      return {
        ...state,
        activeVisualization: action.newVisulizationId,
        visualizationState: {
          ...state.visualizationState,
          [action.newVisulizationId]: action.initialState,
        },
        datasourceState: action.datasourceState ? action.datasourceState : state.datasourceState,
      };
    case 'UPDATE_DATASOURCE_STATE':
      return {
        ...state,
        // when the datasource state is updated, the initialization is complete
        datasourceIsLoading: false,
        datasourceState: action.newState,
      };
    case 'UPDATE_VISUALIZATION_STATE':
      if (state.activeVisualization) {
        return {
          ...state,
          visualizationState: {
            ...state.visualizationState,
            [state.activeVisualization]: action.newState,
          },
        };
      } else {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
    default:
      return state;
  }
};
