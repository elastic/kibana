/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridColumn,
  EuiDataGridSchemaDetector,
  EuiDataGridSorting,
} from '@elastic/eui';
import type {
  Datatable,
  DatatableColumn,
  DatatableColumnMeta,
} from '@kbn/expressions-plugin/common';
import { ClickTriggerEvent } from '@kbn/charts-plugin/public';
import { getSortingCriteria } from '@kbn/sort-predicates';
import { i18n } from '@kbn/i18n';
import type { LensResizeAction, LensSortAction, LensToggleAction } from './types';
import type {
  ColumnConfig,
  ColumnConfigArg,
  LensGridDirection,
} from '../../../../common/expressions';
import { getOriginalId } from '../../../../common/expressions/datatable/transpose_helpers';
import type { FormatFactory } from '../../../../common/types';
import { buildColumnsMetaLookup } from './helpers';

export const createGridResizeHandler =
  (
    columnConfig: ColumnConfig,
    setColumnConfig: React.Dispatch<React.SetStateAction<ColumnConfig>>,
    onEditAction: (data: LensResizeAction['data']) => void
  ) =>
  (eventData: { columnId: string; width: number | undefined }) => {
    const originalColumnId = getOriginalId(eventData.columnId);
    // directly set the local state of the component to make sure the visualization re-renders immediately,
    // re-layouting and taking up all of the available space.
    setColumnConfig({
      ...columnConfig,
      columns: columnConfig.columns.map((column) => {
        if (
          column.columnId === eventData.columnId ||
          column.originalColumnId === originalColumnId
        ) {
          return { ...column, width: eventData.width };
        }
        return column;
      }),
    });
    return onEditAction({
      action: 'resize',
      columnId: originalColumnId,
      width: eventData.width,
    });
  };

export const createGridHideHandler =
  (
    columnConfig: ColumnConfig,
    setColumnConfig: React.Dispatch<React.SetStateAction<ColumnConfig>>,
    onEditAction: (data: LensToggleAction['data']) => void
  ) =>
  (eventData: { columnId: string }) => {
    const originalColumnId = getOriginalId(eventData.columnId);
    // directly set the local state of the component to make sure the visualization re-renders immediately
    setColumnConfig({
      ...columnConfig,
      columns: columnConfig.columns.map((column) => {
        if (
          column.columnId === eventData.columnId ||
          column.originalColumnId === originalColumnId
        ) {
          return { ...column, hidden: true };
        }
        return column;
      }),
    });
    return onEditAction({
      action: 'toggle',
      columnId: originalColumnId,
    });
  };

export const createGridFilterHandler =
  (
    tableRef: React.MutableRefObject<Datatable>,
    onClickValue: (data: ClickTriggerEvent['data']) => void
  ) =>
  (_field: string, value: unknown, colIndex: number, rowIndex: number, negate: boolean = false) => {
    const data: ClickTriggerEvent['data'] = {
      negate,
      data: [
        {
          row: rowIndex,
          column: colIndex,
          value,
          table: tableRef.current,
        },
      ],
    };

    onClickValue(data);
  };

export const createTransposeColumnFilterHandler =
  (
    onClickValue: (data: ClickTriggerEvent['data']) => void,
    untransposedDataRef: React.MutableRefObject<Datatable | undefined>
  ) =>
  (
    bucketValues: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>,
    negate: boolean = false
  ) => {
    if (!untransposedDataRef.current) return;
    const originalTable = untransposedDataRef.current;

    const data: ClickTriggerEvent['data'] = {
      negate,
      data: bucketValues.map(({ originalBucketColumn, value }) => {
        const columnIndex = originalTable.columns.findIndex(
          (c) => c.id === originalBucketColumn.id
        );
        const rowIndex = originalTable.rows.findIndex((r) => r[originalBucketColumn.id] === value);
        return {
          row: rowIndex,
          column: columnIndex,
          value,
          table: originalTable,
        };
      }),
    };

    onClickValue(data);
  };

export const createGridSortingConfig = (
  sortBy: string | undefined,
  sortDirection: LensGridDirection,
  onEditAction: (data: LensSortAction['data']) => void
): EuiDataGridSorting => ({
  columns:
    !sortBy || sortDirection === 'none'
      ? []
      : [
          {
            id: sortBy,
            direction: sortDirection,
          },
        ],
  onSort: (sortingCols) => {
    const newSortValue:
      | {
          id: string;
          direction: Exclude<LensGridDirection, 'none'>;
        }
      | undefined = sortingCols.length <= 1 ? sortingCols[0] : sortingCols[1];
    const isNewColumn = sortBy !== (newSortValue?.id || '');
    const nextDirection = newSortValue ? newSortValue.direction : 'none';

    return onEditAction({
      action: 'sort',
      columnId: nextDirection !== 'none' || isNewColumn ? newSortValue?.id : undefined,
      direction: nextDirection,
    });
  },
});

function isRange(meta: { params?: { id?: string } } | undefined) {
  return meta?.params?.id === 'range';
}

function getColumnType({
  columnConfig,
  columnId,
  lookup,
}: {
  columnConfig: ColumnConfig;
  columnId: string;
  lookup: Record<
    string,
    {
      name: string;
      index: number;
      meta?: DatatableColumnMeta | undefined;
    }
  >;
}) {
  const sortingHint = columnConfig.columns.find((col) => col.columnId === columnId)?.sortingHint;
  return sortingHint ?? (isRange(lookup[columnId]?.meta) ? 'range' : lookup[columnId]?.meta?.type);
}

export const buildSchemaDetectors = (
  columns: EuiDataGridColumn[],
  columnConfig: {
    columns: ColumnConfigArg[];
    sortingColumnId: string | undefined;
    sortingDirection: 'none' | 'asc' | 'desc';
  },
  table: Datatable,
  formatters: Record<string, ReturnType<FormatFactory>>
): EuiDataGridSchemaDetector[] => {
  const columnsReverseLookup = buildColumnsMetaLookup(table);

  return columns.map((column) => {
    const schemaType = getColumnType({
      columnConfig,
      columnId: column.id,
      lookup: columnsReverseLookup,
    });
    const sortingCriteria = getSortingCriteria(schemaType, column.id, formatters?.[column.id]);
    return {
      sortTextAsc: i18n.translate('xpack.lens.datatable.sortTextAsc', {
        defaultMessage: 'Sort Ascending',
      }),
      sortTextDesc: i18n.translate('xpack.lens.datatable.sortTextDesc', {
        defaultMessage: 'Sort Descending',
      }),
      icon: '',
      type: column.id,
      detector: () => 1,
      // This is the actual logic that is used to sort the table
      comparator: (_a, _b, direction, { aIndex, bIndex }) =>
        sortingCriteria(table.rows[aIndex], table.rows[bIndex], direction) as 0 | 1 | -1,
      // When the SO is updated, then this property will trigger a re-sort of the table
      defaultSortDirection:
        columnConfig.sortingColumnId === column.id && columnConfig.sortingDirection !== 'none'
          ? columnConfig.sortingDirection
          : undefined,
    };
  });
};
