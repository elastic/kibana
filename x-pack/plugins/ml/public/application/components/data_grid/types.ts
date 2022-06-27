/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiDataGridCellValueElementProps,
  EuiDataGridPaginationProps,
  EuiDataGridSorting,
  EuiDataGridColumn,
} from '@elastic/eui';

import { Dictionary } from '../../../../common/types/common';
import { ChartData } from '../../../../common/types/field_histograms';

import { INDEX_STATUS } from '../../data_frame_analytics/common/analytics';

import { FeatureImportanceBaseline } from '../../../../common/types/feature_importance';

export type ColumnId = string;
export type DataGridItem = Record<string, any>;

// `undefined` is used to indicate a non-initialized state.
export type ChartsVisible = boolean | undefined;
export type RowCountRelation = estypes.SearchTotalHitsRelation | undefined;

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
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}) => any;

export type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

export interface UseIndexDataReturnType
  extends Pick<
    UseDataGridReturnType,
    | 'chartsVisible'
    | 'chartsButtonVisible'
    | 'ccsWarning'
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
    | 'rowCountRelation'
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
  indexPatternFields?: string[];
}

export interface UseDataGridReturnType {
  ccsWarning: boolean;
  chartsVisible: ChartsVisible;
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
  rowCountRelation: RowCountRelation;
  setCcsWarning: Dispatch<SetStateAction<boolean>>;
  setColumnCharts: Dispatch<SetStateAction<ChartData[]>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setNoDataMessage: Dispatch<SetStateAction<string>>;
  setPagination: Dispatch<SetStateAction<IndexPagination>>;
  setRowCount: Dispatch<SetStateAction<number>>;
  setRowCountRelation: Dispatch<SetStateAction<RowCountRelation>>;
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
