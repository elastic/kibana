/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EditorFrameProps } from '.';

export interface EditorFrameState {
  visualization: {
    activeId: string | null;
    stateMap: {
      [visualizationId: string]: unknown;
    };
  };
  datasource: {
    activeId: string | null;
    state: unknown;
    isLoading: boolean;
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
      newVisualizationId: string;
      initialState: unknown;
    }
  | {
      type: 'SWITCH_DATASOURCE';
      newDatasourceId: string;
    };

export const getInitialState = (props: EditorFrameProps): EditorFrameState => {
  return {
    datasource: {
      state: null,
      isLoading: Boolean(props.initialDatasourceId),
      activeId: props.initialDatasourceId,
    },
    visualization: {
      stateMap: props.initialVisualizationId
        ? {
            [props.initialVisualizationId]: props.visualizationMap[
              props.initialVisualizationId
            ].initialize(),
          }
        : {},
      activeId: props.initialVisualizationId,
    },
  };
};

export const reducer = (state: EditorFrameState, action: Action): EditorFrameState => {
  switch (action.type) {
    case 'SWITCH_DATASOURCE':
      return {
        ...state,
        datasource: {
          ...state.datasource,
          isLoading: true,
          state: null,
          activeId: action.newDatasourceId,
        },
        visualization: {
          ...state.visualization,
          // purge all visualizations on datasource switch
          stateMap: {},
          activeId: null,
        },
      };
    case 'SWITCH_VISUALIZATION':
      return {
        ...state,
        visualization: {
          ...state.visualization,
          activeId: action.newVisualizationId,
          stateMap: {
            ...state.visualization.stateMap,
            [action.newVisualizationId]: action.initialState,
          },
        },
      };
    case 'UPDATE_DATASOURCE_STATE':
      return {
        ...state,
        datasource: {
          ...state.datasource,
          // when the datasource state is updated, the initialization is complete
          isLoading: false,
          state: action.newState,
        },
      };
    case 'UPDATE_VISUALIZATION_STATE':
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
      return {
        ...state,
        visualization: {
          ...state.visualization,
          stateMap: {
            ...state.visualization.stateMap,
            [state.visualization.activeId]: action.newState,
          },
        },
      };
    default:
      return state;
  }
};
