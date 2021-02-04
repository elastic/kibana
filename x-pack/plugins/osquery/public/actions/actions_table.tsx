/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import {
  EuiLink,
  EuiDataGrid,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiLoadingContent,
} from '@elastic/eui';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { useAllActions } from './use_all_actions';
import { ActionEdges, Direction } from '../../common/search_strategy';
import { useRouterNavigate } from '../common/lib/kibana';

const DataContext = createContext<ActionEdges>([]);

const ActionsTableComponent = () => {
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
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const { isLoading: actionsLoading, data: actionsData } = useAllActions({
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]); // initialize to the full set of columns

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [
    visibleColumns,
    setVisibleColumns,
  ]);

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(
    () => ({ rowIndex, columnId, setCellProps }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useContext(DataContext);
      const value = data[rowIndex].fields[columnId];

      if (columnId === 'action_id') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const linkProps = useRouterNavigate(`/live_query/queries/${value}`);
        return <EuiLink {...linkProps}>{value}</EuiLink>;
      }

      return !isEmpty(value) ? value : '-';
    },
    []
  );

  const tableSorting: EuiDataGridSorting = useMemo(
    () => ({ columns: sortingColumns, onSort: setSortingColumns }),
    [setSortingColumns, sortingColumns]
  );

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
    const newColumns = keys(actionsData?.actions[0]?.fields)
      .sort()
      .map((fieldName) => ({
        id: fieldName,
        displayAsText: fieldName.split('.')[1],
        defaultSortDirection: Direction.asc,
      }));

    if (!isEqual(columns, newColumns)) {
      setColumns(newColumns);
      setVisibleColumns(map('id', newColumns));
    }
  }, [columns, actionsData?.actions]);

  if (actionsLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  return (
    <DataContext.Provider value={actionsData?.actions ?? []}>
      <EuiDataGrid
        aria-label="Osquery actions"
        columns={columns}
        columnVisibility={columnVisibility}
        rowCount={actionsData?.totalCount ?? 0}
        renderCellValue={renderCellValue}
        sorting={tableSorting}
        pagination={tablePagination}
      />
    </DataContext.Provider>
  );
};

export const ActionsTable = React.memo(ActionsTableComponent);
