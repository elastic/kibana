/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import { EuiDataGrid, EuiDataGridColumn } from '@elastic/eui';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { useAllActions } from './use_all_actions';
import { Direction } from '../../common/search_strategy';

const DataContext = createContext([]);

const ActionsTableComponent = () => {
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

  const [, { actions, totalCount }] = useAllActions({
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    field: '@timestamp',
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string>([]); // initialize to the full set of columns

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
    setSortingColumns,
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
    const newColumns = keys(actions[0]?.fields)
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
  }, [columns, actions]);

  return (
    <DataContext.Provider value={actions}>
      <EuiDataGrid
        aria-label="Osquery actions"
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

export const ActionsTable = React.memo(ActionsTableComponent);
