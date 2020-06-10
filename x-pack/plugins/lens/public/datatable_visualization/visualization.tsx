/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SuggestionRequest, Visualization, VisualizationSuggestion, Operation } from '../types';
import chartTableSVG from '../assets/chart_datatable.svg';

export interface LayerState {
  layerId: string;
  columns: string[];
}

export interface DatatableVisualizationState {
  layers: LayerState[];
}

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    columns: [],
  };
}

export const datatableVisualization: Visualization<
  DatatableVisualizationState,
  DatatableVisualizationState
> = {
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: 'visTable',
      largeIcon: chartTableSVG,
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Data table',
      }),
    },
  ],

  getVisualizationTypeId() {
    return 'lnsDatatable';
  },

  getLayerIds(state) {
    return state.layers.map((l) => l.layerId);
  },

  clearLayer(state) {
    return {
      layers: state.layers.map((l) => newLayerState(l.layerId)),
    };
  },

  getDescription() {
    return {
      icon: chartTableSVG,
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Data table',
      }),
    };
  },

  switchVisualizationType: (_, state) => state,

  initialize(frame, state) {
    return (
      state || {
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getPersistableState: (state) => state,

  getSuggestions({
    table,
    state,
    keptLayerIds,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged')
    ) {
      return [];
    }
    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.datatable.suggestionLabel', {
            defaultMessage: 'As table',
          })
        : i18n.translate('xpack.lens.datatable.visualizationOf', {
            defaultMessage: 'Table {operations}',
            values: {
              operations:
                table.label ||
                table.columns
                  .map((col) => col.operation.label)
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
        // table with >= 10 columns will have a score of 0.4, fewer columns reduce score
        score: (Math.min(table.columns.length, 10) / 10) * 0.4,
        state: {
          layers: [
            {
              layerId: table.layerId,
              columns: table.columns.map((col) => col.columnId),
            },
          ],
        },
        previewIcon: chartTableSVG,
        // tables are hidden from suggestion bar, but used for drag & drop and chart switching
        hide: true,
      },
    ];
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const datasource = frame.datasourceLayers[layer.layerId];
    const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
    // When we add a column it could be empty, and therefore have no order
    const sortedColumns = Array.from(new Set(originalOrder.concat(layer.columns)));

    return {
      groups: [
        {
          groupId: 'columns',
          groupLabel: i18n.translate('xpack.lens.datatable.columns', {
            defaultMessage: 'Columns',
          }),
          layerId: state.layers[0].layerId,
          accessors: sortedColumns,
          supportsMoreColumns: true,
          filterOperations: () => true,
          dataTestSubj: 'lnsDatatable_column',
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId }) {
    return {
      ...prevState,
      layers: prevState.layers.map((l) => {
        if (l.layerId !== layerId || l.columns.includes(columnId)) {
          return l;
        }
        return { ...l, columns: [...l.columns, columnId] };
      }),
    };
  },
  removeDimension({ prevState, layerId, columnId }) {
    return {
      ...prevState,
      layers: prevState.layers.map((l) =>
        l.layerId === layerId
          ? {
              ...l,
              columns: l.columns.filter((c) => c !== columnId),
            }
          : l
      ),
    };
  },

  toExpression(state, frame) {
    const layer = state.layers[0];
    const datasource = frame.datasourceLayers[layer.layerId];
    const operations = layer.columns
      .map((columnId) => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
      .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_datatable',
          arguments: {
            columns: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'lens_datatable_columns',
                    arguments: {
                      columnIds: operations.map((o) => o.columnId),
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },
};
