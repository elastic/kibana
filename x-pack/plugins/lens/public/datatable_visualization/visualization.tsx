/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  Operation,
  DatasourcePublicAPI,
} from '../types';
import { LensIconChartDatatable } from '../assets/chart_datatable';

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

export const datatableVisualization: Visualization<DatatableVisualizationState> = {
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: LensIconChartDatatable,
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
      icon: LensIconChartDatatable,
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
        previewIcon: LensIconChartDatatable,
        // tables are hidden from suggestion bar, but used for drag & drop and chart switching
        hide: true,
      },
    ];
  },

  getConfiguration({ state, frame, layerId }) {
    const { sortedColumns, datasource } =
      getDataSourceAndSortedColumns(state, frame.datasourceLayers, layerId) || {};

    if (!sortedColumns) {
      return { groups: [] };
    }

    return {
      groups: [
        {
          groupId: 'columns',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdown', {
            defaultMessage: 'Break down by',
          }),
          layerId: state.layers[0].layerId,
          accessors: sortedColumns.filter(
            (c) => datasource!.getOperationForColumnId(c)?.isBucketed
          ),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_column',
        },
        {
          groupId: 'metrics',
          groupLabel: i18n.translate('xpack.lens.datatable.metrics', {
            defaultMessage: 'Metrics',
          }),
          layerId: state.layers[0].layerId,
          accessors: sortedColumns.filter(
            (c) => !datasource!.getOperationForColumnId(c)?.isBucketed
          ),
          supportsMoreColumns: true,
          filterOperations: (op) => !op.isBucketed,
          required: true,
          dataTestSubj: 'lnsDatatable_metrics',
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

  toExpression(state, datasourceLayers, { title, description } = {}): Ast | null {
    const { sortedColumns, datasource } =
      getDataSourceAndSortedColumns(state, datasourceLayers, state.layers[0].layerId) || {};

    if (
      sortedColumns?.length &&
      sortedColumns.filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed).length === 0
    ) {
      return null;
    }

    const operations = sortedColumns!
      .map((columnId) => ({ columnId, operation: datasource!.getOperationForColumnId(columnId) }))
      .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_datatable',
          arguments: {
            title: [title || ''],
            description: [description || ''],
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

  getErrorMessages(state, frame) {
    return undefined;
  },
};

function getDataSourceAndSortedColumns(
  state: DatatableVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  layerId: string
) {
  const layer = state.layers.find((l: LayerState) => l.layerId === layerId);
  if (!layer) {
    return undefined;
  }
  const datasource = datasourceLayers[layer.layerId];
  const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(new Set(originalOrder.concat(layer.columns)));
  return { datasource, sortedColumns };
}
