/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridSorting } from '@elastic/eui';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin';
import type { LensFilterEvent } from '../../types';
import type { LensMultiTable } from '../../../common';
import type { LensResizeAction, LensSortAction, LensToggleAction } from './types';
import type { ColumnConfig, LensGridDirection } from '../../../common/expressions';
import { getOriginalId } from '../../../common/expressions';

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
    onClickValue: (data: LensFilterEvent['data']) => void
  ) =>
  (field: string, value: unknown, colIndex: number, rowIndex: number, negate: boolean = false) => {
    const data: LensFilterEvent['data'] = {
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
    onClickValue: (data: LensFilterEvent['data']) => void,
    untransposedDataRef: React.MutableRefObject<LensMultiTable | undefined>
  ) =>
  (
    bucketValues: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>,
    negate: boolean = false
  ) => {
    if (!untransposedDataRef.current) return;
    const originalTable = Object.values(untransposedDataRef.current.tables)[0];

    const data: LensFilterEvent['data'] = {
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
