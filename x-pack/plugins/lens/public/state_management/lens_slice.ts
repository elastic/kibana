/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { LensAppState } from './types';

export const initialState: LensAppState = {
  searchSessionId: '',
  filters: [],
  query: { language: 'kuery', query: '' },
  resolvedDateRange: { fromDate: '', toDate: '' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: null,
  datasourceStates: {},
  visualization: {
    state: null,
    activeId: null,
  },
};

export const lensSlice = createSlice({
  name: 'lens',
  initialState,
  reducers: {
    setState: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    onActiveDataChange: (state, { payload }: PayloadAction<TableInspectorAdapter>) => {
      return {
        ...state,
        activeData: payload,
      };
    },
    setSaveable: (state, { payload }: PayloadAction<boolean>) => {
      return {
        ...state,
        isSaveable: payload,
      };
    },
    updateState: (
      state,
      action: {
        payload: {
          subType: string;
          updater: (prevState: LensAppState) => LensAppState;
        };
      }
    ) => {
      return action.payload.updater(current(state) as LensAppState);
    },
    updateDatasourceState: (
      state,
      {
        payload,
      }: {
        payload: {
          updater: unknown | ((prevState: unknown) => unknown);
          datasourceId: string;
          clearStagedPreview?: boolean;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.datasourceId]: {
            state:
              typeof payload.updater === 'function'
                ? payload.updater(current(state).datasourceStates[payload.datasourceId].state)
                : payload.updater,
            isLoading: false,
          },
        },
        stagedPreview: payload.clearStagedPreview ? undefined : state.stagedPreview,
      };
    },
    updateVisualizationState: (
      state,
      {
        payload,
      }: {
        payload: {
          visualizationId: string;
          updater: unknown | ((state: unknown) => unknown);
          clearStagedPreview?: boolean;
        };
      }
    ) => {
      if (!state.visualization.activeId) {
        throw new Error('Invariant: visualization state got updated without active visualization');
      }
      // This is a safeguard that prevents us from accidentally updating the
      // wrong visualization. This occurs in some cases due to the uncoordinated
      // way we manage state across plugins.
      if (state.visualization.activeId !== payload.visualizationId) {
        return state;
      }
      return {
        ...state,
        visualization: {
          ...state.visualization,
          state:
            typeof payload.updater === 'function'
              ? payload.updater(current(state.visualization.state))
              : payload.updater,
        },
        stagedPreview: payload.clearStagedPreview ? undefined : state.stagedPreview,
      };
    },
    updateLayer: (
      state,
      {
        payload,
      }: {
        payload: {
          layerId: string;
          datasourceId: string;
          updater: (state: unknown, layerId: string) => unknown;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.datasourceId]: {
            ...state.datasourceStates[payload.datasourceId],
            state: payload.updater(
              current(state).datasourceStates[payload.datasourceId].state,
              payload.layerId
            ),
          },
        },
      };
    },

    switchVisualization: (
      state,
      {
        payload,
      }: {
        payload: {
          newVisualizationId: string;
          initialState: unknown;
          datasourceState?: unknown;
          datasourceId?: string;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates:
          'datasourceId' in payload && payload.datasourceId
            ? {
                ...state.datasourceStates,
                [payload.datasourceId]: {
                  ...state.datasourceStates[payload.datasourceId],
                  state: payload.datasourceState,
                },
              }
            : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: payload.newVisualizationId,
          state: payload.initialState,
        },
        stagedPreview: undefined,
      };
    },
    selectSuggestion: (
      state,
      {
        payload,
      }: {
        payload: {
          newVisualizationId: string;
          initialState: unknown;
          datasourceState: unknown;
          datasourceId: string;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates:
          'datasourceId' in payload && payload.datasourceId
            ? {
                ...state.datasourceStates,
                [payload.datasourceId]: {
                  ...state.datasourceStates[payload.datasourceId],
                  state: payload.datasourceState,
                },
              }
            : state.datasourceStates,
        visualization: {
          ...state.visualization,
          activeId: payload.newVisualizationId,
          state: payload.initialState,
        },
        stagedPreview: state.stagedPreview || {
          datasourceStates: state.datasourceStates,
          visualization: state.visualization,
        },
      };
    },
    rollbackSuggestion: (state) => {
      return {
        ...state,
        ...(state.stagedPreview || {}),
        stagedPreview: undefined,
      };
    },
    setToggleFullscreen: (state) => {
      return { ...state, isFullscreenDatasource: !state.isFullscreenDatasource };
    },
    submitSuggestion: (state) => {
      return {
        ...state,
        stagedPreview: undefined,
      };
    },
    switchDatasource: (
      state,
      {
        payload,
      }: {
        payload: {
          newDatasourceId: string;
        };
      }
    ) => {
      return {
        ...state,
        datasourceStates: {
          ...state.datasourceStates,
          [payload.newDatasourceId]: state.datasourceStates[payload.newDatasourceId] || {
            state: null,
            isLoading: true,
          },
        },
        activeDatasourceId: payload.newDatasourceId,
      };
    },
    navigateAway: (state) => state,
  },
});

export const reducer = {
  lens: lensSlice.reducer,
};
