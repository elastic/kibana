/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  OperationMetadata,
} from '../types';
import { toExpression, toPreviewExpression } from './to_expression';
import { LayerState, PieVisualizationState } from './types';
import { CHART_NAMES } from './constants';

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

  getSuggestions({
    table,
    state,
    keptLayerIds,
  }: SuggestionRequest<PieVisualizationState>): Array<
    VisualizationSuggestion<PieVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged') ||
      table.columns.some(col => col.operation.dataType === 'date')
    ) {
      return [];
    }

    const [slices, metrics] = partition(table.columns, col => col.operation.isBucketed);

    if (slices.length === 0 || metrics.length > 1) {
      return [];
    }

    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.pie.suggestionLabel', {
            defaultMessage: 'As {chartName}',
            values: { chartName: state ? CHART_NAMES[state.shape].label : CHART_NAMES.donut.label },
          })
        : i18n.translate('xpack.lens.pie.suggestionOf', {
            defaultMessage: '{chartName} {operations}',
            values: {
              chartName: state ? CHART_NAMES[state.shape].label : CHART_NAMES.donut.label,
              operations:
                table.label ||
                table.columns
                  .map(col => col.operation.label)
                  .join(
                    i18n.translate('xpack.lens.datatable.conjunctionSign', {
                      defaultMessage: ' & ',
                      description:
                        'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                    })
                  ),
            },
          });

    return [
      {
        title,
        score: 0.6,
        state: {
          shape: state ? state.shape : 'donut',
          layers: [
            {
              layerId: table.layerId,
              slices: slices.map(col => col.columnId),
              metric: metrics[0].columnId,
            },
          ],
        },
        previewIcon: 'bullseye',
        // dont show suggestions for reduced versions or single-line tables
        hide: table.changeType === 'reduced',
      },
    ];
  },

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
          supportsMoreColumns: sortedColumns.length < 3,
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
