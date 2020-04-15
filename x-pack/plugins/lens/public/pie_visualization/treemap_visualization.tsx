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

import { pieVisualization } from './pie_visualization';

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

    if (slices.length > 2 || metrics.length > 1) {
      return [];
    }

    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.pie.suggestionLabel', {
            defaultMessage: 'As {chartName}',
            values: { chartName: CHART_NAMES.treemap.label },
          })
        : i18n.translate('xpack.lens.pie.suggestionOf', {
            defaultMessage: '{chartName} {operations}',
            values: {
              chartName: CHART_NAMES.treemap.label,
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
          shape: 'treemap',
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
          groupId: 'rectangle',
          groupLabel: i18n.translate('xpack.lens.treemap.rectangle', {
            defaultMessage: 'Rectangle',
          }),
          layerId,
          accessors: sortedColumns,
          supportsMoreColumns: sortedColumns.length < 2,
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
