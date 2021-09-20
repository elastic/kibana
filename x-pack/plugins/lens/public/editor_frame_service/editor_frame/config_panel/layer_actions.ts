/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { LayerType } from '../../../../common';
import { LensAppState } from '../../../state_management';

import { Datasource, Visualization } from '../../../types';

interface RemoveLayerOptions {
  trackUiEvent: (name: string) => void;
  state: LensAppState;
  layerId: string;
  activeVisualization: Pick<Visualization, 'getLayerIds' | 'clearLayer' | 'removeLayer'>;
  datasourceMap: Record<string, Pick<Datasource, 'clearLayer' | 'removeLayer'>>;
}

interface AppendLayerOptions {
  trackUiEvent: (name: string) => void;
  state: LensAppState;
  generateId: () => string;
  activeDatasource: Pick<Datasource, 'insertLayer' | 'id'>;
  activeVisualization: Pick<Visualization, 'appendLayer'>;
  layerType: LayerType;
}

export function removeLayer(opts: RemoveLayerOptions): LensAppState {
  const { state, trackUiEvent: trackUiEvent, activeVisualization, layerId, datasourceMap } = opts;
  const isOnlyLayer = activeVisualization
    .getLayerIds(state.visualization.state)
    .every((id) => id === opts.layerId);

  trackUiEvent(isOnlyLayer ? 'layer_cleared' : 'layer_removed');

  return {
    ...state,
    datasourceStates: mapValues(state.datasourceStates, (datasourceState, datasourceId) => {
      const datasource = datasourceMap[datasourceId!];
      return {
        ...datasourceState,
        state: isOnlyLayer
          ? datasource.clearLayer(datasourceState.state, layerId)
          : datasource.removeLayer(datasourceState.state, layerId),
      };
    }),
    visualization: {
      ...state.visualization,
      state:
        isOnlyLayer || !activeVisualization.removeLayer
          ? activeVisualization.clearLayer(state.visualization.state, layerId)
          : activeVisualization.removeLayer(state.visualization.state, layerId),
    },
    stagedPreview: undefined,
  };
}

export function appendLayer({
  trackUiEvent,
  activeVisualization,
  state,
  generateId,
  activeDatasource,
  layerType,
}: AppendLayerOptions): LensAppState {
  trackUiEvent('layer_added');

  if (!activeVisualization.appendLayer) {
    return state;
  }

  const layerId = generateId();

  return {
    ...state,
    datasourceStates: {
      ...state.datasourceStates,
      [activeDatasource.id]: {
        ...state.datasourceStates[activeDatasource.id],
        state: activeDatasource.insertLayer(
          state.datasourceStates[activeDatasource.id].state,
          layerId
        ),
      },
    },
    visualization: {
      ...state.visualization,
      state: activeVisualization.appendLayer(state.visualization.state, layerId, layerType),
    },
    stagedPreview: undefined,
  };
}
