/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { EuiDataGridSorting } from '@elastic/eui';
import type { Datatable } from 'src/plugins/expressions';
import type { LensFilterEvent } from '../../types';
import type {
  DatatableColumns,
  LensGridDirection,
  LensResizeAction,
  LensSortAction,
} from './types';

import { desanitizeFilterContext } from '../../utils';

export const createGridResizeHandler = (
  columnConfig: DatatableColumns & {
    type: 'lens_datatable_columns';
  },
  setColumnConfig: React.Dispatch<
    React.SetStateAction<
      DatatableColumns & {
        type: 'lens_datatable_columns';
      }
    >
  >,
  onEditAction: (data: LensResizeAction['data']) => void
) => (eventData: { columnId: string; width: number | undefined }) => {
  // directly set the local state of the component to make sure the visualization re-renders immediately,
  // re-layouting and taking up all of the available space.
  setColumnConfig({
    ...columnConfig,
    columnWidth: [
      ...(columnConfig.columnWidth || []).filter(({ columnId }) => columnId !== eventData.columnId),
      ...(eventData.width !== undefined
        ? [
            {
              columnId: eventData.columnId,
              width: eventData.width,
              type: 'lens_datatable_column_width' as const,
            },
          ]
        : []),
    ],
  });
  return onEditAction({
    action: 'resize',
    columnId: eventData.columnId,
    width: eventData.width,
  });
};

export const createGridFilterHandler = (
  tableRef: React.MutableRefObject<Datatable>,
  onClickValue: (data: LensFilterEvent['data']) => void
) => (
  field: string,
  value: unknown,
  colIndex: number,
  rowIndex: number,
  negate: boolean = false
) => {
  const col = tableRef.current.columns[colIndex];
  const isDate = col.meta?.type === 'date';
  const timeFieldName = negate && isDate ? undefined : col?.meta?.field;

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
    timeFieldName,
  };

  onClickValue(desanitizeFilterContext(data));
};

export const createGridSortingConfig = (
  sortBy: string,
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
