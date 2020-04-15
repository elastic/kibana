/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { EuiDataGridSorting, EuiDataGridColumn } from '@elastic/eui';

import { EsDocSource, EsFieldName, INIT_MAX_COLUMNS } from '../../common';

import { IndexPagination, OnChangeItemsPerPage, OnChangePage, OnSort, INDEX_STATUS } from './types';

const defaultPagination: IndexPagination = { pageIndex: 0, pageSize: 5 };

export const useDataGrid = (columns: EuiDataGridColumn[]) => {
  const [noDataMessage, setNoDataMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [rowCount, setRowCount] = useState(0);
  const [tableItems, setTableItems] = useState<EsDocSource[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(pageSize => {
    setPagination(p => {
      const pageIndex = Math.floor((p.pageSize * p.pageIndex) / pageSize);
      return { pageIndex, pageSize };
    });
  }, []);

  const onChangePage: OnChangePage = useCallback(
    pageIndex => setPagination(p => ({ ...p, pageIndex })),
    []
  );

  const resetPagination = () => setPagination(defaultPagination);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<EsFieldName[]>([]);

  const columnIds = columns.map(c => c.id);
  const defaultVisibleColumns = columnIds.splice(0, INIT_MAX_COLUMNS);

  useEffect(() => {
    setVisibleColumns(defaultVisibleColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVisibleColumns.join()]);

  const [invalidSortingColumnns, setInvalidSortingColumnns] = useState<string[]>([]);

  const onSort: OnSort = useCallback(
    sc => {
      // Check if an unsupported column type for sorting was selected.
      const updatedInvalidSortingColumnns = sc.reduce<string[]>((arr, current) => {
        const columnType = columns.find(dgc => dgc.id === current.id);
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
    errorMessage,
    invalidSortingColumnns,
    noDataMessage,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    pagination,
    resetPagination,
    rowCount,
    status,
    setErrorMessage,
    setNoDataMessage,
    setPagination,
    setRowCount,
    setStatus,
    setTableItems,
    setVisibleColumns,
    sortingColumns,
    tableItems,
    visibleColumns,
  };
};
