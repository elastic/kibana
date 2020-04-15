/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction } from 'react';

import { EuiDataGridPaginationProps, EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { EsDocSource, EsFieldName } from '../../common';

export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

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

export interface UseIndexDataReturnType {
  columns: EuiDataGridColumn[];
  errorMessage: string;
  invalidSortingColumnns: EsFieldName[];
  noDataMessage: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onChangePage: OnChangePage;
  onSort: OnSort;
  pagination: IndexPagination;
  setPagination: Dispatch<SetStateAction<IndexPagination>>;
  setVisibleColumns: Dispatch<SetStateAction<EsFieldName[]>>;
  renderCellValue: RenderCellValue;
  rowCount: number;
  sortingColumns: EuiDataGridSorting['columns'];
  status: INDEX_STATUS;
  tableItems: EsDocSource[];
  visibleColumns: EsFieldName[];
}
