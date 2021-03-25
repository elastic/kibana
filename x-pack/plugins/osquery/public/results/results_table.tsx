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
import { useKibana } from '../common/lib/kibana';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  agentId?: string;
  isLive?: boolean;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentId,
  isLive,
}) => {
  const { getUrlForApp } = useKibana().services.application;

  const getFleetAppUrl = useCallback(
    (fleetAgentId) => getUrlForApp('fleet', { path: `#/fleet/agents/${fleetAgentId}` }),
    [getUrlForApp]
  );

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

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const { data: allResultsData } = useAllResults({
    actionId,
    agentId,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
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

      // @ts-expect-error update types
      const value = data[rowIndex % pagination.pageSize]?.fields[columnId];

      if (columnId === 'agent.name') {
        // @ts-expect-error update types
        const agentIdValue = data[rowIndex % pagination.pageSize]?.fields['agent.id'];

        return (
          <EuiLink href={getFleetAppUrl(agentIdValue)} target="_blank">
            {value}
          </EuiLink>
        );
      }

      return !isEmpty(value) ? value : '-';
    },
    [getFleetAppUrl, pagination.pageSize]
  );

  const tableSorting = useMemo(() => ({ columns: sortingColumns, onSort: setSortingColumns }), [
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
    if (!allResultsData?.edges) {
      return;
    }

    const newColumns = keys(allResultsData?.edges[0]?.fields)
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
  }, [columns, allResultsData?.edges]);

  return (
    // @ts-expect-error update types
    <DataContext.Provider value={allResultsData?.edges}>
      <EuiDataGrid
        aria-label="Osquery results"
        columns={columns}
        columnVisibility={columnVisibility}
        rowCount={allResultsData?.totalCount ?? 0}
        renderCellValue={renderCellValue}
        sorting={tableSorting}
        pagination={tablePagination}
        height="500px"
      />
    </DataContext.Provider>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
