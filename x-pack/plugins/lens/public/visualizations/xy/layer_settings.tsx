/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
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
    <EuiFormRow
      display="columnCompressedSwitch"
      label={i18n.translate('xpack.lens.xyChart.ignoreGlobalFilters', {
        defaultMessage: 'Use global filters',
      })}
    >
      <EuiSwitch
        label={i18n.translate('xpack.lens.xyChart.ignoreGlobalFilters', {
          defaultMessage: 'Use global filters',
        })}
        showLabel={false}
        checked={!layer.ignoreGlobalFilters}
        data-test-subj="lnsXY-layerSettings-ignoreGlobalFilters"
        onChange={() => {
          const layerIndex = state.layers.findIndex((l) => l === layer);
          const newLayer = { ...layer, ignoreGlobalFilters: !layer.ignoreGlobalFilters };
          const newLayers = [...state.layers];
          newLayers[layerIndex] = newLayer;
          setState({ ...state, layers: newLayers });
        }}
        compressed
      />
    </EuiFormRow>
  );
}
