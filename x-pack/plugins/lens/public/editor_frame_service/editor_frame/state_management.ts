/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EditorFrameProps } from './index';
import { Document } from '../../persistence/saved_object_store';

export interface PreviewState {
  visualization: {
    activeId: string | null;
    state: unknown;
  };
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
}

export interface EditorFrameState extends PreviewState {
  persistedId?: string;
  title: string;
  description?: string;
  stagedPreview?: PreviewState;
  activeDatasourceId: string | null;
  isFullscreenDatasource?: boolean;
}

export type Action =
  | {
      type: 'RESET';
      state: EditorFrameState;
    }
  | {
      type: 'UPDATE_TITLE';
      title: string;
    }
  | {
      type: 'UPDATE_STATE';
      // Just for diagnostics, so we can determine what action
      // caused this update.
      subType: string;
      updater: (prevState: EditorFrameState) => EditorFrameState;
    }
  | {
      type: 'UPDATE_DATASOURCE_STATE';
      updater: unknown | ((prevState: unknown) => unknown);
      datasourceId: string;
      clearStagedPreview?: boolean;
    }
  | {
      type: 'UPDATE_VISUALIZATION_STATE';
      visualizationId: string;
      updater: unknown | ((state: unknown) => unknown);
      clearStagedPreview?: boolean;
    }
  | {
      type: 'UPDATE_LAYER';
      layerId: string;
      datasourceId: string;
      updater: (state: unknown, layerId: string) => unknown;
    }
  | {
      type: 'VISUALIZATION_LOADED';
      doc: Document;
    }
  | {
      type: 'SWITCH_VISUALIZATION';
      newVisualizationId: string;
      initialState: unknown;
    }
  | {
      type: 'SWITCH_VISUALIZATION';
      newVisualizationId: string;
      initialState: unknown;
      datasourceState: unknown;
      datasourceId: string;
    }
  | {
      type: 'SELECT_SUGGESTION';
      newVisualizationId: string;
      initialState: unknown;
      datasourceState: unknown;
      datasourceId: string;
    }
  | {
      type: 'ROLLBACK_SUGGESTION';
    }
  | {
      type: 'SUBMIT_SUGGESTION';
    }
  | {
      type: 'SWITCH_DATASOURCE';
      newDatasourceId: string;
    }
  | {
      type: 'TOGGLE_FULLSCREEN';
    };

export function getActiveDatasourceIdFromDoc(doc?: Document) {
  if (!doc) {
    return null;
  }

  const [firstDatasourceFromDoc] = Object.keys(doc.state.datasourceStates);
  return firstDatasourceFromDoc || null;
}

export const getInitialState = (
  params: EditorFrameProps & { doc?: Document }
): EditorFrameState => {
  const datasourceStates: EditorFrameState['datasourceStates'] = {};

  const initialDatasourceId =
    getActiveDatasourceIdFromDoc(params.doc) || Object.keys(params.datasourceMap)[0] || null;

  const initialVisualizationId =
    (params.doc && params.doc.visualizationType) || Object.keys(params.visualizationMap)[0] || null;

  if (params.doc) {
    Object.entries(params.doc.state.datasourceStates).forEach(([datasourceId, state]) => {
      datasourceStates[datasourceId] = { isLoading: true, state };
    });
  } else if (initialDatasourceId) {
    datasourceStates[initialDatasourceId] = {
      state: null,
      isLoading: true,
    };
  }

  return {
    title: '',
    datasourceStates,
    activeDatasourceId: initialDatasourceId,
    visualization: {
      state: null,
      activeId: initialVisualizationId,
    },
  };
};

export const reducer = (state: EditorFrameState, action: Action): EditorFrameState => {
  switch (action.type) {
    case 'RESET':
      return action.state;
    case 'UPDATE_TITLE':
      return { ...state, title: action.title };
    case 'UPDATE_STATE':
      return action.updater(state);
    case 'UPDATE_LAYER':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.datasourceId]: {
            ...state.datasourceStates[action.datasourceId],
            state: action.updater(
              state.datasourceStates[action.datasourceId].state,
              action.layerId
            ),
          },
        },
      };
    case 'VISUALIZATION_LOADED':
      return {
        ...state,
        persistedId: action.doc.savedObjectId,
        title: action.doc.title,
        description: action.doc.description,
        datasourceStates: Object.entries(action.doc.state.datasourceStates).reduce(
          (stateMap, [datasourceId, datasourceState]) => ({
            ...stateMap,
            [datasourceId]: {
              isLoading: true,
              state: datasourceState,
            },
          }),
          {}
        ),
        activeDatasourceId: getActiveDatasourceIdFromDoc(action.doc),
        visualization: {
          ...state.visualization,
          activeId: action.doc.visualizationType,
          state: action.doc.state.visualization,
        },
      };
    case 'SWITCH_DATASOURCE':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.newDatasourceId]: state.datasourceStates[action.newDatasourceId] || {
            state: null,
            isLoading: true,
          },
        },
        activeDatasourceId: action.newDatasourceId,
      };
    case 'SWITCH_VISUALIZATION':
      return {
        ...state,
        datasourceStates:
          'datasourceId' in action && action.datasourceId
            ? {
                ...state.datasourceStates,
                [action.datasourceId]: {
                  ...state.datasourceStates[action.datasourceId],
                  state: action.datasourceState,
                },
              }
            : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: action.newVisualizationId,
          state: action.initialState,
        },
        stagedPreview: undefined,
      };
    case 'SELECT_SUGGESTION':
      return {
        ...state,
        datasourceStates:
          'datasourceId' in action && action.datasourceId
            ? {
                ...state.datasourceStates,
                [action.datasourceId]: {
                  ...state.datasourceStates[action.datasourceId],
                  state: action.datasourceState,
                },
              }
            : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: action.newVisualizationId,
          state: action.initialState,
        },
        stagedPreview: state.stagedPreview || {
          datasourceStates: state.datasourceStates,
          visualization: state.visualization,
        },
      };
    case 'ROLLBACK_SUGGESTION':
      return {
        ...state,
        ...(state.stagedPreview || {}),
        stagedPreview: undefined,
      };
    case 'SUBMIT_SUGGESTION':
      return {
        ...state,
        stagedPreview: undefined,
      };
    case 'UPDATE_DATASOURCE_STATE':
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [action.datasourceId]: {
            state:
              typeof action.updater === 'function'
                ? action.updater(state.datasourceStates[action.datasourceId].state)
                : action.updater,
            isLoading: false,
          },
        },
        stagedPreview: action.clearStagedPreview ? undefined : state.stagedPreview,
      };
    case 'UPDATE_VISUALIZATION_STATE':
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
      // This is a safeguard that prevents us from accidentally updating the
      // wrong visualization. This occurs in some cases due to the uncoordinated
      // way we manage state across plugins.
      if (state.visualization.activeId !== action.visualizationId) {
        return state;
      }
      return {
        ...state,
        visualization: {
          ...state.visualization,
          state:
            typeof action.updater === 'function'
              ? action.updater(state.visualization.state)
              : action.updater,
        },
        stagedPreview: action.clearStagedPreview ? undefined : state.stagedPreview,
      };
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreenDatasource: !state.isFullscreenDatasource };
    default:
      return state;
  }
};
