/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import {
  EuiDataGrid,
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiLink,
  EuiTextColor,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';

import { pagePathGetters } from '../../../fleet/public';
import { useAllResults } from './use_all_results';
import { Direction, ResultEdges } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { useActionResults } from '../action_results/use_action_results';
import { generateEmptyDataMessage } from './translations';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  isLive?: boolean;
}

interface SummaryTableValue {
  total: number | string;
  pending: number | string;
  responded: number;
  failed: number;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  isLive,
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

  const notRespondedCount = useMemo(() => {
    if (!agentIds || !aggregations.totalResponded) {
      return '-';
    }

    return agentIds.length - aggregations.totalResponded;
  }, [aggregations.totalResponded, agentIds]);

  const summaryColumns: Array<EuiBasicTableColumn<SummaryTableValue>> = useMemo(
    () => [
      {
        field: 'total',
        name: 'Agents queried',
      },
      {
        field: 'responded',
        name: 'Successful',
      },
      {
        field: 'pending',
        name: 'Not yet responded',
      },
      {
        field: 'failed',
        name: 'Failed',
        // eslint-disable-next-line react/display-name
        render: (failed: number) => (
          <EuiTextColor color={failed ? 'danger' : 'default'}>{failed}</EuiTextColor>
        ),
      },
    ],
    []
  );

  const summaryItems = useMemo(
    () => [
      {
        total: agentIds?.length ?? '-',
        pending: notRespondedCount,
        responded: aggregations.totalResponded,
        failed: aggregations.failed,
      },
    ],
    [aggregations, agentIds, notRespondedCount]
  );

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

  const [columns, setColumns] = useState<EuiDataGridColumn[]>([]);

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const { data: allResultsData } = useAllResults({
    actionId,
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

  return (
    // @ts-expect-error update types
    <DataContext.Provider value={allResultsData?.edges}>
      <EuiBasicTable items={summaryItems} rowHeader="total" columns={summaryColumns} />
      <EuiSpacer />
      {columns.length > 0 ? (
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
      ) : (
        <div className={'eui-textCenter'}>
          {generateEmptyDataMessage(aggregations.totalResponded)}
        </div>
      )}
    </DataContext.Provider>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
