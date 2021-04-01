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
import { DatatableColumn } from 'src/plugins/expressions/public';
import {
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
  isTransposed?: boolean;
  // These flags are necessary to transpose columns and map them back later
  // They are set automatically and are not user-editable
  transposable?: boolean;
  originalColumnId?: string;
  originalName?: string;
  bucketValues?: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>;
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

const visualizationLabel = i18n.translate('xpack.lens.datatable.label', {
  defaultMessage: 'Table',
});

export const datatableVisualization: Visualization<DatatableVisualizationState> = {
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: LensIconChartDatatable,
      label: visualizationLabel,
      groupLabel: i18n.translate('xpack.lens.datatable.groupLabel', {
        defaultMessage: 'Tabular and single value',
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
      label: visualizationLabel,
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
    const lastTransposedColumnIndex = table.columns.findIndex((c) =>
      !oldColumnSettings[c.columnId] ? false : !oldColumnSettings[c.columnId]?.isTransposed
    );
    const usesTransposing = state?.columns.some((c) => c.isTransposed);

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
          columns: table.columns.map((col, columnIndex) => ({
            ...(oldColumnSettings[col.columnId] || {}),
            isTransposed: usesTransposing && columnIndex < lastTransposedColumnIndex,
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
          groupId: 'rows',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownRows', {
            defaultMessage: 'Split rows',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownRows.description', {
            defaultMessage:
              'Split table rows by field. This is recommended for high cardinality breakdowns.',
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter(
              (c) =>
                datasource!.getOperationForColumnId(c)?.isBucketed &&
                !state.columns.find((col) => col.columnId === c)?.isTransposed
            )
            .map((accessor) => ({
              columnId: accessor,
              triggerIcon: columnMap[accessor].hidden ? 'invisible' : undefined,
            })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_rows',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 1,
        },
        {
          groupId: 'columns',
          groupLabel: i18n.translate('xpack.lens.datatable.breakdownColumns', {
            defaultMessage: 'Split columns',
          }),
          groupTooltip: i18n.translate('xpack.lens.datatable.breakdownColumns.description', {
            defaultMessage:
              "Split metric columns by field. It's recommended to keep the number of columns low to avoid horizontal scrolling.",
          }),
          layerId: state.layerId,
          accessors: sortedColumns
            .filter(
              (c) =>
                datasource!.getOperationForColumnId(c)?.isBucketed &&
                state.columns.find((col) => col.columnId === c)?.isTransposed
            )
            .map((accessor) => ({ columnId: accessor })),
          supportsMoreColumns: true,
          filterOperations: (op) => op.isBucketed,
          dataTestSubj: 'lnsDatatable_columns',
          enableDimensionEditor: true,
          hideGrouping: true,
          nestingOrder: 0,
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

  setDimension({ prevState, columnId, groupId, previousColumn }) {
    if (
      prevState.columns.some(
        (column) =>
          column.columnId === columnId || (previousColumn && column.columnId === previousColumn)
      )
    ) {
      return {
        ...prevState,
        columns: prevState.columns.map((column) => {
          if (column.columnId === columnId || column.columnId === previousColumn) {
            return { ...column, columnId, isTransposed: groupId === 'columns' };
          }
          return column;
        }),
      };
    }
    return {
      ...prevState,
      columns: [...prevState.columns, { columnId, isTransposed: groupId === 'columns' }],
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
                    isTransposed:
                      typeof column.isTransposed === 'undefined' ? [] : [column.isTransposed],
                    transposable: [
                      !datasource!.getOperationForColumnId(column.columnId)?.isBucketed,
                    ],
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
