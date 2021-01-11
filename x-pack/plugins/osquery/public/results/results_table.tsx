/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import { EuiDataGrid, EuiDataGridColumn } from '@elastic/eui';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { useAllResults } from './use_all_results';
import { Direction } from '../../common/search_strategy';

const DataContext = createContext<any[]>([]);

interface ResultsTableComponentProps {
  actionId: string;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({ actionId }) => {
  // ** Pagination config
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((currentPagination) => ({ ...currentPagination, pageIndex })),
    [setPagination]
  );

  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);

  // ** Sorting config
  const [sortingColumns, setSortingColumns] = useState<string[]>([]);
  const onSort = useCallback(
    (newSortingColumns) => {
      setSortingColumns(newSortingColumns);
    },
    [setSortingColumns]
  );

  const [, { results, totalCount }] = useAllResults({
    actionId,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    field: '@timestamp',
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]); // initialize to the full set of columns

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [
    visibleColumns,
    setVisibleColumns,
  ]);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      const data = useContext(DataContext);

      const value = data[rowIndex].fields[columnId];

      return !isEmpty(value) ? value : '-';
    };
  }, []);

  const tableSorting = useMemo(() => ({ columns: sortingColumns, onSort }), [
    onSort,
    sortingColumns,
  ]);

  const tablePagination = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: [10, 50, 100],
      onChangeItemsPerPage,
      onChangePage,
    }),
    [onChangeItemsPerPage, onChangePage, pagination]
  );

  useEffect(() => {
    const newColumns = keys(results[0]?.fields)
      .sort()
      .map((fieldName) => ({
        id: fieldName,
        displayAsText: fieldName.split('.')[1],
        defaultSortDirection: 'asc',
      }));

    if (!isEqual(columns, newColumns)) {
      setColumns(newColumns);
      setVisibleColumns(map('id', newColumns));
    }
  }, [columns, results]);

  return (
    <DataContext.Provider value={results}>
      <EuiDataGrid
        aria-label="Osquery results"
        columns={columns}
        columnVisibility={columnVisibility}
        rowCount={totalCount}
        renderCellValue={renderCellValue}
        sorting={tableSorting}
        pagination={tablePagination}
      />
    </DataContext.Provider>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
