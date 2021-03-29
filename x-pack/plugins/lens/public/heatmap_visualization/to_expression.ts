/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter/common';
import { DatasourcePublicAPI } from '../types';
import { ColumnState } from '../datatable_visualization/visualization';
import { FUNCTION_NAME } from './constants';
import { HeatmapVisualizationState } from './types';

// export const toPreviewExpression =

export const toExpression = (state: HeatmapVisualizationState): Ast | null => {
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
        function: FUNCTION_NAME,
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
                  transposable: [!datasource!.getOperationForColumnId(column.columnId)?.isBucketed],
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
};
