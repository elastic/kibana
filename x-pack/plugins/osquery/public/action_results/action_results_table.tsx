/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find, map } from 'lodash/fp';
import {
  EuiDataGrid,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiHealth,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import React, { createContext, useState, useCallback, useContext, useMemo } from 'react';

import { useAllAgents } from './../agents/use_all_agents';
import { useActionResults } from './use_action_results';
import { useAllResults } from '../results/use_all_results';
import { Direction, ResultEdges } from '../../common/search_strategy';
import { useRouterNavigate } from '../common/lib/kibana';

const DataContext = createContext<ResultEdges>([]);

interface ActionResultsTableProps {
  actionId: string;
}

const ActionResultsTableComponent: React.FC<ActionResultsTableProps> = ({ actionId }) => {
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

  const [columns] = useState<EuiDataGridColumn[]>([
    {
      id: 'status',
      displayAsText: 'status',
      defaultSortDirection: Direction.asc,
    },
    {
      id: 'rows_count',
      displayAsText: '# rows',
      defaultSortDirection: Direction.asc,
    },
    {
      id: 'agent_status',
      displayAsText: 'online',
      defaultSortDirection: Direction.asc,
    },
    {
      id: 'agent',
      displayAsText: 'agent',
      defaultSortDirection: Direction.asc,
    },
    {
      id: '@timestamp',
      displayAsText: '@timestamp',
      defaultSortDirection: Direction.asc,
    },
  ]);

  // ** Sorting config
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const { data: actionResultsData } = useActionResults({
    actionId,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => map('id', columns)); // initialize to the full set of columns

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns }), [
    visibleColumns,
    setVisibleColumns,
  ]);

  const { data: agentsData } = useAllAgents({
    activePage: 0,
    limit: 1000,
    direction: Direction.desc,
    sortField: '@timestamp',
  });

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(
    () => ({ rowIndex, columnId, setCellProps }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const data = useContext(DataContext);
      const value = data[rowIndex];

      if (columnId === 'status') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const linkProps = useRouterNavigate(
          `/live_query/queries/${actionId}/results/${value.fields.agent_id[0]}`
        );

        return (
          <>
            <EuiIcon type="checkInCircleFilled" />
            <EuiLink {...linkProps}>{'View results'}</EuiLink>
          </>
        );
      }

      if (columnId === 'rows_count') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [, { totalCount: agentResultsCount }] = useAllResults({
          actionId,
          agentId: value.fields.agent_id[0],
          activePage: pagination.pageIndex,
          limit: pagination.pageSize,
          direction: Direction.asc,
          sortField: '@timestamp',
        });
        return agentResultsCount;
      }

      if (columnId === 'agent_status') {
        const agentIdValue = value.fields.agent_id[0];
        const agent = find(['_id', agentIdValue], agentsData?.agents);
        const online = agent?.active;
        const color = online ? 'success' : 'danger';
        const label = online ? 'Online' : 'Offline';
        return <EuiHealth color={color}>{label}</EuiHealth>;
      }

      if (columnId === 'agent') {
        const agentIdValue = value.fields.agent_id[0];
        const agent = find(['_id', agentIdValue], agentsData?.agents);
        const agentName = agent?.local_metadata.host.name;

        console.error(
          'aaa',
          value,
          agentIdValue,
          agentName,
          find(['_id', agentIdValue], agentsData?.agents)
        );
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const linkProps = useRouterNavigate(
          `/live_query/queries/${actionId}/results/${agentIdValue}`
        );
        return (
          <EuiLink {...linkProps}>{`(${agent?.local_metadata.os.name}) ${agentName}`}</EuiLink>
        );
      }

      if (columnId === '@timestamp') {
        return value.fields['@timestamp'];
      }

      return '-';
    },
    [actionId, agentsData?.agents, pagination.pageIndex, pagination.pageSize]
  );

  const tableSorting: EuiDataGridSorting = useMemo(
    () => ({ columns: sortingColumns, onSort: setSortingColumns }),
    [sortingColumns]
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

  return (
    <DataContext.Provider value={actionResultsData?.results}>
      <EuiDataGrid
        aria-label="Osquery results"
        columns={columns}
        columnVisibility={columnVisibility}
        rowCount={actionResultsData?.totalCount}
        renderCellValue={renderCellValue}
        sorting={tableSorting}
        pagination={tablePagination}
      />
    </DataContext.Provider>
  );
};

export const ActionResultsTable = React.memo(ActionResultsTableComponent);
