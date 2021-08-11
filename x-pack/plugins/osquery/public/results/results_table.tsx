/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keys, map } from 'lodash/fp';
import {
  EuiCallOut,
  EuiCode,
  EuiDataGrid,
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiLink,
  EuiLoadingContent,
  EuiProgress,
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
import {
  ViewResultsInDiscoverAction,
  ViewResultsInLensAction,
  ViewResultsActionButtonType,
} from '../scheduled_query_groups/scheduled_query_group_queries_table';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  endDate?: string;
  startDate?: string;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  startDate,
  endDate,
}) => {
  const [isLive, setIsLive] = useState(true);
  const { data: hasActionResultsPrivileges } = useActionResultsPrivileges();
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
    skip: !hasActionResultsPrivileges,
  });
  const expired = useMemo(() => (!endDate ? false : new Date(endDate) < new Date()), [endDate]);
  const { getUrlForApp } = useKibana().services.application;

  const getFleetAppUrl = useCallback(
    (agentId) =>
      getUrlForApp('fleet', {
        path: `#` + pagePathGetters.agent_details({ agentId })[1],
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
    skip: !hasActionResultsPrivileges,
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
      showStyleSelector: false,
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

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || expired) return false;

        const uniqueAgentsRepliedCount =
          // @ts-expect-error-type
          allResultsData?.rawResponse.aggregations?.unique_agents.value ?? 0;

        return !!(uniqueAgentsRepliedCount !== agentIds?.length - aggregations.failed);
      }),
    [
      agentIds?.length,
      aggregations.failed,
      // @ts-expect-error-type
      allResultsData?.rawResponse.aggregations?.unique_agents.value,
      expired,
    ]
  );

  if (!hasActionResultsPrivileges) {
    return (
      <EuiCallOut title="Missing privileges" color="danger" iconType="alert">
        <p>
          {'Your user role doesn’t have index read permissions on the '}
          <EuiCode>logs-{OSQUERY_INTEGRATION_NAME}.result*</EuiCode>
          {
            'index. Access to this index is required to view osquery results. Administrators can update role permissions in Stack Management > Roles.'
          }
        </p>
      </EuiCallOut>
    );
  }

  if (!isFetched) {
    return <EuiLoadingContent lines={5} />;
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" />}

      {isFetched && !allResultsData?.edges.length ? (
        <>
          <EuiCallOut title={generateEmptyDataMessage(aggregations.totalResponded)} />
          <EuiSpacer />
        </>
      ) : (
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
      )}
    </>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
