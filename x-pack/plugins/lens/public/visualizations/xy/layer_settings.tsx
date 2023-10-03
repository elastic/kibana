/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { IgnoreGlobalFilterRowControl } from '../../shared_components/ignore_global_filter';
import type { VisualizationLayerSettingsProps } from '../../types';
import type { XYState } from './types';
import { isAnnotationsLayer } from './visualization_helpers';

export function LayerSettings({
  state,
  setState,
  section,
  layerId,
}: VisualizationLayerSettingsProps<XYState> & { section: 'data' | 'appearance' }) {
  if (section === 'appearance') {
    return null;
  }
  const layer = state.layers.find((l) => l.layerId === layerId);
  if (!layer || !isAnnotationsLayer(layer)) {
    return null;
  }
  return (
    <IgnoreGlobalFilterRowControl
      checked={!layer.ignoreGlobalFilters}
      onChange={() => {
        const layerIndex = state.layers.findIndex((l) => l === layer);
        const newLayer = { ...layer, ignoreGlobalFilters: !layer.ignoreGlobalFilters };
        const newLayers = [...state.layers];
        newLayers[layerIndex] = newLayer;
        trackUiCounterEvents(
          newLayer.ignoreGlobalFilters ? `ignore_global_filters` : `use_global_filters`
        );
        setState({ ...state, layers: newLayers });
      }}
    />
  );
}
