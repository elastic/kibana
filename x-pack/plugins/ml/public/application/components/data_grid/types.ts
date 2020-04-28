/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction } from 'react';
import { SearchResponse } from 'elasticsearch';

import { EuiDataGridPaginationProps, EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { Dictionary } from '../../../../common/types/common';

import { INDEX_STATUS } from '../../data_frame_analytics/common/analytics';

export type ColumnId = string;
export type DataGridItem = Record<string, any>;

export type IndexPagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;

export type OnChangeItemsPerPage = (pageSize: any) => void;
export type OnChangePage = (pageIndex: any) => void;
export type OnSort = (
  sc: Array<{
    id: string;
    direction: 'asc' | 'desc';
  }>
) => void;

export type RenderCellValue = ({
  rowIndex,
  columnId,
  setCellProps,
}: {
  rowIndex: number;
  columnId: string;
  setCellProps: any;
}) => any;

export type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
export interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

export interface UseIndexDataReturnType
  extends Pick<
    UseDataGridReturnType,
    | 'errorMessage'
    | 'invalidSortingColumnns'
    | 'noDataMessage'
    | 'onChangeItemsPerPage'
    | 'onChangePage'
    | 'onSort'
    | 'pagination'
    | 'setPagination'
    | 'setVisibleColumns'
    | 'rowCount'
    | 'sortingColumns'
    | 'status'
    | 'tableItems'
    | 'visibleColumns'
  > {
  columns: EuiDataGridColumn[];
  renderCellValue: RenderCellValue;
}

export interface UseDataGridReturnType {
  errorMessage: string;
  invalidSortingColumnns: ColumnId[];
  noDataMessage: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onChangePage: OnChangePage;
  onSort: OnSort;
  pagination: IndexPagination;
  resetPagination: () => void;
  rowCount: number;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setNoDataMessage: Dispatch<SetStateAction<string>>;
  setPagination: Dispatch<SetStateAction<IndexPagination>>;
  setRowCount: Dispatch<SetStateAction<number>>;
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  setStatus: Dispatch<SetStateAction<INDEX_STATUS>>;
  setTableItems: Dispatch<SetStateAction<DataGridItem[]>>;
  setVisibleColumns: Dispatch<SetStateAction<ColumnId[]>>;
  sortingColumns: EuiDataGridSorting['columns'];
  status: INDEX_STATUS;
  tableItems: DataGridItem[];
  visibleColumns: ColumnId[];
}
