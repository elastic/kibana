/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Visualization, OperationMetadata } from '../types';
import { toExpression, toPreviewExpression } from './to_expression';
import { LayerState, PieVisualizationState } from './types';
import { pieSuggestions } from './suggestions';
import { CHART_NAMES, MAX_PIE_BUCKETS } from './constants';

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

export const pieVisualization: Visualization<PieVisualizationState, PieVisualizationState> = {
  id: 'lnsPie',

  visualizationTypes: [
    {
      id: 'donut',
      largeIcon: CHART_NAMES.donut.icon,
      label: CHART_NAMES.donut.label,
    },
    {
      id: 'pie',
      largeIcon: CHART_NAMES.pie.icon,
      label: CHART_NAMES.pie.label,
    },
  ],

  getLayerIds(state) {
    return state.layers.map(l => l.layerId);
  },

  clearLayer(state) {
    return {
      shape: state.shape,
      layers: state.layers.map(l => newLayerState(l.layerId)),
    };
  },

  getDescription(state) {
    if (state.shape === 'donut') {
      return CHART_NAMES.donut;
    }
    return CHART_NAMES.pie;
  },

  switchVisualizationType: (visualizationTypeId, state) => ({
    ...state,
    shape: visualizationTypeId as PieVisualizationState['shape'],
  }),

  initialize(frame, state) {
    return (
      state || {
        shape: 'donut',
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions: pieSuggestions,

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
          groupId: 'slices',
          groupLabel: i18n.translate('xpack.lens.pie.slices', {
            defaultMessage: 'Slices',
          }),
          layerId,
          accessors: sortedColumns,
          supportsMoreColumns: sortedColumns.length < MAX_PIE_BUCKETS,
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

      shape:
        prevState.shape === 'donut' && prevState.layers.every(l => l.slices.length === 1)
          ? 'pie'
          : prevState.shape,
      layers: prevState.layers.map(l => {
        if (l.layerId !== layerId) {
          return l;
        }
        if (groupId === 'slices') {
          return {
            ...l,
            slices: [...l.slices, columnId],
          };
        }
        return { ...l, metric: columnId };
      }),
    };
  },
  removeDimension({ prevState, layerId, columnId }) {
    return {
      ...prevState,
      layers: prevState.layers.map(l => {
        if (l.layerId !== layerId) {
          return l;
        }

        if (l.metric === columnId) {
          return {
            ...l,
            metric: undefined,
          };
        }
        return {
          ...l,
          slices: l.slices.filter(c => c !== columnId),
        };
      }),
    };
  },

  toExpression,
  toPreviewExpression,
};
