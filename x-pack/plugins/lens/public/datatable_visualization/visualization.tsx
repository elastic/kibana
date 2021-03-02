/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { Ast } from '@kbn/interpreter/common';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type {
  SuggestionRequest,
  Visualization,
  VisualizationSuggestion,
  DatasourcePublicAPI,
} from '../types';
import { LensIconChartDatatable } from '../assets/chart_datatable';
import { TableDimensionEditor } from './components/dimension_editor';

export interface ColumnState {
  columnId: string;
  width?: number;
  hidden?: boolean;
  alignment?: 'left' | 'right' | 'center';
}

export interface SortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface DatatableVisualizationState {
  columns: ColumnState[];
  layerId: string;
  sorting?: SortingState;
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
    return [state.layerId];
  },

  clearLayer(state) {
    return {
      ...state,
      columns: [],
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
        columns: [],
        layerId: frame.addNewLayer(),
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
    const oldColumnSettings: Record<string, ColumnState> = {};
    if (state) {
      state.columns.forEach((column) => {
        oldColumnSettings[column.columnId] = column;
      });
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
          ...(state || {}),
          layerId: table.layerId,
          columns: table.columns.map((col) => ({
            ...(oldColumnSettings[col.columnId] || {}),
            columnId: col.columnId,
          })),
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

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

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
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => datasource!.getOperationForColumnId(c)?.isBucketed)
            .map((accessor) => ({
              columnId: accessor,
              triggerIcon: columnMap[accessor].hidden ? 'invisible' : undefined,
            })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_column',
          enableDimensionEditor: true,
        },
        {
          groupId: 'metrics',
          groupLabel: i18n.translate('xpack.lens.datatable.metrics', {
            defaultMessage: 'Metrics',
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed)
            .map((accessor) => ({
              columnId: accessor,
              triggerIcon: columnMap[accessor].hidden ? 'invisible' : undefined,
            })),
          supportsMoreColumns: true,
          filterOperations: (op) => !op.isBucketed,
          required: true,
          dataTestSubj: 'lnsDatatable_metrics',
          enableDimensionEditor: true,
        },
      ],
    };
  },

  setDimension({ prevState, columnId }) {
    if (prevState.columns.some((column) => column.columnId === columnId)) {
      return prevState;
    }
    return {
      ...prevState,
      columns: [...prevState.columns, { columnId }],
    };
  },
  removeDimension({ prevState, columnId }) {
    return {
      ...prevState,
      columns: prevState.columns.filter((column) => column.columnId !== columnId),
      sorting: prevState.sorting?.columnId === columnId ? undefined : prevState.sorting,
    };
  },
  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <TableDimensionEditor {...props} />
      </I18nProvider>,
      domElement
    );
  },

  toExpression(state, datasourceLayers, { title, description } = {}): Ast | null {
    const { sortedColumns, datasource } =
      getDataSourceAndSortedColumns(state, datasourceLayers, state.layerId) || {};

    if (
      sortedColumns?.length &&
      sortedColumns.filter((c) => !datasource!.getOperationForColumnId(c)?.isBucketed).length === 0
    ) {
      return null;
    }

    const columnMap: Record<string, ColumnState> = {};
    state.columns.forEach((column) => {
      columnMap[column.columnId] = column;
    });

    const columns = sortedColumns!
      .filter((columnId) => datasource!.getOperationForColumnId(columnId))
      .map((columnId) => columnMap[columnId]);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_datatable',
          arguments: {
            title: [title || ''],
            description: [description || ''],
            columns: columns.map((column) => ({
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_datatable_column',
                  arguments: {
                    columnId: [column.columnId],
                    hidden: typeof column.hidden === 'undefined' ? [] : [column.hidden],
                    width: typeof column.width === 'undefined' ? [] : [column.width],
                    alignment: typeof column.alignment === 'undefined' ? [] : [column.alignment],
                  },
                },
              ],
            })),
            sortingColumnId: [state.sorting?.columnId || ''],
            sortingDirection: [state.sorting?.direction || 'none'],
          },
        },
      ],
    };
  },

  getErrorMessages(state) {
    return undefined;
  },

  onEditAction(state, event) {
    switch (event.data.action) {
      case 'sort':
        return {
          ...state,
          sorting: {
            columnId: event.data.columnId,
            direction: event.data.direction,
          },
        };
      case 'toggle':
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === event.data.columnId) {
              return {
                ...column,
                hidden: !column.hidden,
              };
            } else {
              return column;
            }
          }),
        };
      case 'resize':
        const targetWidth = event.data.width;
        return {
          ...state,
          columns: state.columns.map((column) => {
            if (column.columnId === event.data.columnId) {
              return {
                ...column,
                width: targetWidth,
              };
            } else {
              return column;
            }
          }),
        };
      default:
        return state;
    }
  },
};

function getDataSourceAndSortedColumns(
  state: DatatableVisualizationState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  layerId: string
) {
  const datasource = datasourceLayers[state.layerId];
  const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(
    new Set(originalOrder.concat(state.columns.map(({ columnId }) => columnId)))
  );
  return { datasource, sortedColumns };
}
