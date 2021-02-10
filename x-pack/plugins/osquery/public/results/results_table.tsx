/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import { EuiDataGrid, EuiDataGridProps, EuiDataGridColumn, EuiLink } from '@elastic/eui';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { EuiDataGridSorting } from '@elastic/eui';
import { useAllResults } from './use_all_results';
import { Direction, ResultEdges } from '../../common/search_strategy';
import { useRouterNavigate } from '../common/lib/kibana';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  agentId?: string;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({ actionId, agentId }) => {
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
  const onSort = useCallback(
    (newSortingColumns) => {
      setSortingColumns(newSortingColumns);
    },
    [setSortingColumns]
  );

  const { data: allResultsData = [] } = useAllResults({
    actionId,
    agentId,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [
    visibleColumns,
    setVisibleColumns,
  ]);

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(
    () => ({ rowIndex, columnId }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useContext(DataContext);

      const value = data[rowIndex].fields[columnId];

      if (columnId === 'agent.name') {
        const agentIdValue = data[rowIndex].fields['agent.id'];
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const linkProps = useRouterNavigate(
          `/live_query/queries/${actionId}/results/${agentIdValue}`
        );
        return <EuiLink {...linkProps}>{value}</EuiLink>;
      }

      return !isEmpty(value) ? value : '-';
    },
    [actionId]
  );

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
    // @ts-expect-error update types
    const newColumns = keys(allResultsData?.results[0]?.fields)
      .sort()
      .reduce((acc, fieldName) => {
        if (fieldName === 'agent.name') {
          return [
            ...acc,
            {
              id: fieldName,
              displayAsText: 'agent',
              defaultSortDirection: Direction.asc,
            },
          ];
        }

        if (fieldName.startsWith('osquery.')) {
          return [
            ...acc,
            {
              id: fieldName,
              displayAsText: fieldName.split('.')[1],
              defaultSortDirection: Direction.asc,
            },
          ];
        }

        return acc;
      }, [] as EuiDataGridColumn[]);

    if (!isEqual(columns, newColumns)) {
      setColumns(newColumns);
      setVisibleColumns(map('id', newColumns));
    }
    // @ts-expect-error update types
  }, [columns, allResultsData?.results]);

  return (
    // @ts-expect-error update types
    <DataContext.Provider value={allResultsData?.results}>
      <EuiDataGrid
        aria-label="Osquery results"
        columns={columns}
        columnVisibility={columnVisibility}
        // @ts-expect-error update types
        rowCount={allResultsData?.totalCount ?? 0}
        renderCellValue={renderCellValue}
        sorting={tableSorting}
        pagination={tablePagination}
      />
    </DataContext.Provider>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
