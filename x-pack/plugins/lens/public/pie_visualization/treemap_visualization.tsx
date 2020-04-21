/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Visualization, OperationMetadata } from '../types';
import { LayerState, PieVisualizationState } from './types';
import { treemapSuggestions } from './suggestions';
import { CHART_NAMES, MAX_TREEMAP_BUCKETS } from './constants';
import { pieVisualization } from './pie_visualization';

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    slices: [],
    metric: undefined,
  };
}

const bucketedOperations = (op: OperationMetadata) => op.isBucketed;
const numberMetricOperations = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

export const treemapVisualization: Visualization<PieVisualizationState, PieVisualizationState> = {
  ...pieVisualization,
  id: 'lnsTreemap',

  visualizationTypes: [
    {
      id: 'treemap',
      largeIcon: CHART_NAMES.treemap.icon,
      label: CHART_NAMES.treemap.label,
    },
  ],

  getDescription(state) {
    return CHART_NAMES.treemap;
  },

  initialize(frame, state) {
    return (
      state || {
        shape: 'treemap',
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getSuggestions: treemapSuggestions,

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find(l => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];
    const originalOrder = datasource
      .getTableSpec()
      .map(({ columnId }) => columnId)
      .filter(columnId => columnId !== layer.metric);
    // When we add a column it could be empty, and therefore have no order
    const sortedColumns = Array.from(new Set(originalOrder.concat(layer.slices)));

    return {
      groups: [
        {
          groupId: 'rectangle',
          groupLabel: i18n.translate('xpack.lens.treemap.rectangle', {
            defaultMessage: 'Rectangle',
          }),
          layerId,
          accessors: sortedColumns,
          supportsMoreColumns: sortedColumns.length < MAX_TREEMAP_BUCKETS,
          filterOperations: bucketedOperations,
          required: true,
        },
        {
          groupId: 'metric',
          groupLabel: i18n.translate('xpack.lens.pie.metric', {
            defaultMessage: 'Metric',
          }),
          layerId,
          accessors: layer.metric ? [layer.metric] : [],
          supportsMoreColumns: !layer.metric,
          filterOperations: numberMetricOperations,
          required: true,
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId }) {
    return {
      ...prevState,
      layers: prevState.layers.map(l => {
        if (l.layerId !== layerId) {
          return l;
        }
        if (groupId === 'rectangle') {
          return {
            ...l,
            slices: [...l.slices, columnId],
          };
        }
        return { ...l, metric: columnId };
      }),
    };
  },
};
