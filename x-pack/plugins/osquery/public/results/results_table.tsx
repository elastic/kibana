/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import {
  EuiCallOut,
  EuiDataGrid,
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiLink,
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { pagePathGetters } from '../../../fleet/public';
import { useAllResults } from './use_all_results';
import { Direction, ResultEdges } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { useActionResults } from '../action_results/use_action_results';
import { generateEmptyDataMessage } from './translations';
import {
  ViewResultsInDiscoverAction,
  ViewResultsInLensAction,
  ViewResultsActionButtonType,
} from '../scheduled_query_groups/scheduled_query_group_queries_table';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  endDate?: string;
  isLive?: boolean;
  startDate?: string;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  isLive,
  startDate,
  endDate,
}) => {
  const {
    // @ts-expect-error update types
    data: { aggregations },
  } = useActionResults({
    actionId,
    activePage: 0,
    agentIds,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
  });

  const { getUrlForApp } = useKibana().services.application;

  const getFleetAppUrl = useCallback(
    (agentId) =>
      getUrlForApp('fleet', {
        path: `#` + pagePathGetters.fleet_agent_details({ agentId }),
      }),
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

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    {
      id: 'agent.name',
      direction: Direction.asc,
    },
  ]);
  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);

  const { data: allResultsData, isFetched } = useAllResults({
    actionId,
    activePage: pagination.pageIndex,
    limit: pagination.pageSize,
    isLive,
    sort: sortingColumns.map((sortedColumn) => ({
      field: sortedColumn.id,
      direction: sortedColumn.direction as Direction,
    })),
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

        return <EuiLink href={getFleetAppUrl(agentIdValue)}>{value}</EuiLink>;
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
      .reduce(
        (acc, fieldName) => {
          const { data, seen } = acc;
          if (fieldName === 'agent.name') {
            data.push({
              id: fieldName,
              displayAsText: i18n.translate(
                'xpack.osquery.liveQueryResults.table.agentColumnTitle',
                {
                  defaultMessage: 'agent',
                }
              ),
              defaultSortDirection: Direction.asc,
            });

            return acc;
          }

          if (fieldName.startsWith('osquery.')) {
            const displayAsText = fieldName.split('.')[1];
            if (!seen.has(displayAsText)) {
              data.push({
                id: fieldName,
                displayAsText,
                defaultSortDirection: Direction.asc,
              });
              seen.add(displayAsText);
            }
            return acc;
          }

          return acc;
        },
        { data: [], seen: new Set<string>() } as { data: EuiDataGridColumn[]; seen: Set<string> }
      ).data;

    if (!isEqual(columns, newColumns)) {
      setColumns(newColumns);
      setVisibleColumns(map('id', newColumns));
    }
  }, [columns, allResultsData?.edges]);

  const toolbarVisibility = useMemo(
    () => ({
      additionalControls: (
        <>
          <ViewResultsInDiscoverAction
            actionId={actionId}
            buttonType={ViewResultsActionButtonType.button}
            endDate={endDate}
            startDate={startDate}
          />
          <ViewResultsInLensAction
            actionId={actionId}
            buttonType={ViewResultsActionButtonType.button}
            endDate={endDate}
            startDate={startDate}
          />
        </>
      ),
    }),
    [actionId, endDate, startDate]
  );

  if (!aggregations.totalResponded) {
    return <EuiLoadingContent lines={5} />;
  }

  if (aggregations.totalResponded && isFetched && !allResultsData?.edges.length) {
    return <EuiCallOut title={generateEmptyDataMessage(aggregations.totalResponded)} />;
  }

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
        toolbarVisibility={toolbarVisibility}
      />
    </DataContext.Provider>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
