/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { ES_CLIENT_TOTAL_HITS_RELATION } from '../../../../common/types/es_client';
import { ChartData } from '../../../../common/types/field_histograms';

import { INDEX_STATUS } from '../../data_frame_analytics/common';

import { ColumnChart } from './column_chart';
import { COLUMN_CHART_DEFAULT_VISIBILITY_ROWS_THRESHOLED, INIT_MAX_COLUMNS } from './common';
import {
  ChartsVisible,
  ColumnId,
  DataGridItem,
  IndexPagination,
  OnChangeItemsPerPage,
  OnChangePage,
  OnSort,
  RowCountRelation,
  UseDataGridReturnType,
} from './types';

export const useDataGrid = (
  columns: EuiDataGridColumn[],
  defaultPageSize = 5,
  defaultVisibleColumnsCount = INIT_MAX_COLUMNS,
  defaultVisibleColumnsFilter?: (id: string) => boolean
): UseDataGridReturnType => {
  const defaultPagination: IndexPagination = { pageIndex: 0, pageSize: defaultPageSize };

  const [ccsWarning, setCcsWarning] = useState(false);
  const [noDataMessage, setNoDataMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [rowCount, setRowCount] = useState(0);
  const [rowCountRelation, setRowCountRelation] = useState<RowCountRelation>(undefined);
  const [columnCharts, setColumnCharts] = useState<ChartData[]>([]);
  const [tableItems, setTableItems] = useState<DataGridItem[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [chartsVisible, setChartsVisible] = useState<ChartsVisible>(undefined);

  const toggleChartVisibility = () => {
    if (chartsVisible !== undefined) {
      setChartsVisible(!chartsVisible);
    }
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
  }, [defaultVisibleColumns.join()]);

  const [invalidSortingColumnns, setInvalidSortingColumnns] = useState<string[]>([]);

  const onSort: OnSort = useCallback(
    (sc) => {
      // Check if an unsupported column type for sorting was selected.
      const updatedInvalidSortingColumns = sc.reduce<string[]>((arr, current) => {
        const columnType = columns.find((dgc) => dgc.id === current.id);
        if (columnType?.schema === 'json') {
          arr.push(current.id);
        }
        return arr;
      }, []);
      setInvalidSortingColumnns(updatedInvalidSortingColumns);
      if (updatedInvalidSortingColumns.length === 0) {
        setSortingColumns(sc);
      }
    },
    [columns]
  );

  const columnsWithCharts = useMemo(() => {
    const updatedColumns = columns.map((c, index) => {
      const chartData = columnCharts.find((cd) => cd.id === c.id);

      return {
        ...c,
        display:
          chartData !== undefined && chartsVisible === true ? (
            <ColumnChart
              chartData={chartData}
              columnType={c}
              dataTestSubj={`mlDataGridChart-${c.id}`}
            />
          ) : undefined,
      };
    });

    // Sort the columns to be in line with the current order of visible columns.
    // EuiDataGrid misses a callback for the order of all available columns, so
    // this only can retain the order of visible columns.
    return updatedColumns.sort((a, b) => {
      // This will always move visible columns above invisible ones.
      if (visibleColumns.indexOf(a.id) === -1 && visibleColumns.indexOf(b.id) > -1) {
        return 1;
      }
      if (visibleColumns.indexOf(b.id) === -1 && visibleColumns.indexOf(a.id) > -1) {
        return -1;
      }
      if (visibleColumns.indexOf(a.id) === -1 && visibleColumns.indexOf(b.id) === -1) {
        return a.id.localeCompare(b.id);
      }

      // If both columns are visible sort by their visible sorting order.
      return visibleColumns.indexOf(a.id) - visibleColumns.indexOf(b.id);
    });
  }, [columns, columnCharts, chartsVisible, JSON.stringify(visibleColumns)]);

  // Initialize the mini histogram charts toggle button.
  // On load `chartsVisible` is set to `undefined`, the button will be disabled.
  // Once we know how many rows have been returned,
  // we decide whether to show or hide the charts by default.
  useEffect(() => {
    if (chartsVisible === undefined && rowCount > 0 && rowCountRelation !== undefined) {
      setChartsVisible(
        rowCount <= COLUMN_CHART_DEFAULT_VISIBILITY_ROWS_THRESHOLED &&
          rowCountRelation !== ES_CLIENT_TOTAL_HITS_RELATION.GTE
      );
    }
  }, [chartsVisible, rowCount, rowCountRelation]);

  return {
    ccsWarning,
    chartsVisible,
    chartsButtonVisible: true,
    columnsWithCharts,
    errorMessage,
    invalidSortingColumnns,
    noDataMessage,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    pagination,
    resetPagination,
    rowCount,
    rowCountRelation,
    setColumnCharts,
    setCcsWarning,
    setErrorMessage,
    setNoDataMessage,
    setPagination,
    setRowCount,
    setRowCountRelation,
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
