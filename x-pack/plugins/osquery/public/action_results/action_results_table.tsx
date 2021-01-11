/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import { EuiDataGrid, EuiDataGridColumn } from '@elastic/eui';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { useAllResults } from './use_action_results';
import { Direction, ResultEdge } from '../../common/search_strategy';

const DataContext = createContext<ResultEdge[]>([]);

interface ActionResultsTableProps {
  actionId: string;
}

const ActionResultsTableComponent: React.FC<ActionResultsTableProps> = ({ actionId }) => {
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

  const tableSorting = useMemo(() => ({ columns: sortingColumns, onSort: setSortingColumns }), [
    sortingColumns,
  ]);

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
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 50, 100],
          onChangeItemsPerPage,
          onChangePage,
        }}
      />
    </DataContext.Provider>
  );
};

export const ActionResultsTable = React.memo(ActionResultsTableComponent);
