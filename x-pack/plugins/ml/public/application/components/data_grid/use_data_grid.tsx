/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { INDEX_STATUS } from '../../data_frame_analytics/common';

import { ColumnChart } from './column_chart';
import { INIT_MAX_COLUMNS } from './common';
import {
  ColumnId,
  DataGridItem,
  IndexPagination,
  OnChangeItemsPerPage,
  OnChangePage,
  OnSort,
  UseDataGridReturnType,
} from './types';
import { ChartData } from './use_column_chart';

export const useDataGrid = (
  columns: EuiDataGridColumn[],
  defaultPageSize = 5,
  defaultVisibleColumnsCount = INIT_MAX_COLUMNS,
  defaultVisibleColumnsFilter?: (id: string) => boolean
): UseDataGridReturnType => {
  const defaultPagination: IndexPagination = { pageIndex: 0, pageSize: defaultPageSize };

  const [noDataMessage, setNoDataMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [rowCount, setRowCount] = useState(0);
  const [columnCharts, setColumnCharts] = useState<ChartData[]>([]);
  const [tableItems, setTableItems] = useState<DataGridItem[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [chartsVisible, setChartsVisible] = useState(false);

  const toggleChartVisibility = () => {
    setChartsVisible(!chartsVisible);
  };

  const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback((pageSize) => {
    setPagination((p) => {
      const pageIndex = Math.floor((p.pageSize * p.pageIndex) / pageSize);
      return { pageIndex, pageSize };
    });
  }, []);

  const onChangePage: OnChangePage = useCallback(
    (pageIndex) => setPagination((p) => ({ ...p, pageIndex })),
    []
  );

  const resetPagination = () => setPagination(defaultPagination);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([]);

  const columnIds = columns.map((c) => c.id);
  const filteredColumnIds =
    defaultVisibleColumnsFilter !== undefined
      ? columnIds.filter(defaultVisibleColumnsFilter)
      : columnIds;
  const defaultVisibleColumns = filteredColumnIds.splice(0, defaultVisibleColumnsCount);

  useEffect(() => {
    setVisibleColumns(defaultVisibleColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVisibleColumns.join()]);

  const [invalidSortingColumnns, setInvalidSortingColumnns] = useState<string[]>([]);

  const onSort: OnSort = useCallback(
    (sc) => {
      // Check if an unsupported column type for sorting was selected.
      const updatedInvalidSortingColumnns = sc.reduce<string[]>((arr, current) => {
        const columnType = columns.find((dgc) => dgc.id === current.id);
        if (columnType?.schema === 'json') {
          arr.push(current.id);
        }
        return arr;
      }, []);
      setInvalidSortingColumnns(updatedInvalidSortingColumnns);
      if (updatedInvalidSortingColumnns.length === 0) {
        setSortingColumns(sc);
      }
    },
    [columns]
  );

  return {
    chartsVisible,
    chartsButtonVisible: true,
    columnsWithCharts: columns.map((c, index) => {
      const chartData = columnCharts.find((cd) => cd.id === c.id);

      return {
        ...c,
        display:
          chartData !== undefined && chartsVisible === true ? (
            <ColumnChart
              chartData={chartData}
              columnType={c}
              dataTestSubj={`mlDataGridChart-${index}`}
            />
          ) : undefined,
      };
    }),
    errorMessage,
    invalidSortingColumnns,
    noDataMessage,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    pagination,
    resetPagination,
    rowCount,
    setColumnCharts,
    setErrorMessage,
    setNoDataMessage,
    setPagination,
    setRowCount,
    setSortingColumns,
    setStatus,
    setTableItems,
    setVisibleColumns,
    sortingColumns,
    status,
    tableItems,
    toggleChartVisibility,
    visibleColumns,
  };
};
