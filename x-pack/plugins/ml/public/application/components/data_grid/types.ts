/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction } from 'react';

import { EuiDataGridPaginationProps, EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { Dictionary } from '../../../../common/types/common';

import { INDEX_STATUS } from '../../data_frame_analytics/common/analytics';

import { ChartData } from './use_column_chart';
import { FeatureImportanceBaseline } from '../../../../common/types/feature_importance';

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

export interface UseIndexDataReturnType
  extends Pick<
    UseDataGridReturnType,
    | 'chartsVisible'
    | 'chartsButtonVisible'
    | 'columnsWithCharts'
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
    | 'toggleChartVisibility'
    | 'visibleColumns'
    | 'baseline'
    | 'predictionFieldName'
    | 'resultsField'
  > {
  renderCellValue: RenderCellValue;
}

export interface UseDataGridReturnType {
  chartsVisible: boolean;
  chartsButtonVisible: boolean;
  columnsWithCharts: EuiDataGridColumn[];
  errorMessage: string;
  invalidSortingColumnns: ColumnId[];
  noDataMessage: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onChangePage: OnChangePage;
  onSort: OnSort;
  pagination: IndexPagination;
  resetPagination: () => void;
  rowCount: number;
  setColumnCharts: Dispatch<SetStateAction<ChartData[]>>;
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
  toggleChartVisibility: () => void;
  visibleColumns: ColumnId[];
  baseline?: FeatureImportanceBaseline;
  predictionFieldName?: string;
  resultsField?: string;
}
