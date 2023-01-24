/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty, isArray, isObject, isEqual, keys, map, reduce } from 'lodash/fp';
import type {
  EuiDataGridSorting,
  EuiDataGridProps,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import {
  EuiCallOut,
  EuiCode,
  EuiDataGrid,
  EuiPanel,
  EuiLink,
  EuiLoadingContent,
  EuiProgress,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { createContext, useEffect, useState, useCallback, useContext, useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import styled from 'styled-components';
import { AddToTimelineButton } from '../timelines/add_to_timeline_button';
import { useAllResults } from './use_all_results';
import type { ResultEdges } from '../../common/search_strategy';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { useActionResults } from '../action_results/use_action_results';
import { generateEmptyDataMessage } from './translations';
import {
  ViewResultsInDiscoverAction,
  ViewResultsInLensAction,
  ViewResultsActionButtonType,
} from '../packs/pack_queries_status_table';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_NAME as OSQUERY_PLUGIN_NAME } from '../../common';
import { AddToCaseWrapper } from '../cases/add_to_cases';

const DataContext = createContext<ResultEdges>([]);

const StyledEuiDataGrid = styled(EuiDataGrid)`
  :not(.euiDataGrid--fullScreen) {
    max-height: 500px;
  }
`;

export interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  ecsMapping?: ECSMapping;
  endDate?: string;
  startDate?: string;
  liveQueryActionId?: string;
  error?: string;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  ecsMapping,
  startDate,
  endDate,
  liveQueryActionId,
  error,
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
  const {
    application: { getUrlForApp },
    appName,
    timelines,
  } = useKibana().services;

  const getFleetAppUrl = useCallback(
    (agentId) =>
      getUrlForApp('fleet', {
        path: pagePathGetters.agent_details({ agentId })[1],
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

  const { data: allResultsData, isLoading } = useAllResults({
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
  const columnVisibility = useMemo(
    () => ({ visibleColumns, setVisibleColumns }),
    [visibleColumns, setVisibleColumns]
  );

  const ecsMappingColumns = useMemo(() => keys(ecsMapping || {}), [ecsMapping]);

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(
    () =>
      // eslint-disable-next-line react/display-name
      ({ rowIndex, columnId }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const data = useContext(DataContext);

        // @ts-expect-error update types
        const value = data[rowIndex % pagination.pageSize]?.fields[columnId];

        if (columnId === 'agent.name') {
          // @ts-expect-error update types
          const agentIdValue = data[rowIndex % pagination.pageSize]?.fields['agent.id'];

          return <EuiLink href={getFleetAppUrl(agentIdValue)}>{value}</EuiLink>;
        }

        if (ecsMappingColumns.includes(columnId)) {
          const ecsFieldValue = get(columnId, data[rowIndex % pagination.pageSize]?._source);

          if (isArray(ecsFieldValue) || isObject(ecsFieldValue)) {
            try {
              return JSON.stringify(ecsFieldValue, null, 2);
              // eslint-disable-next-line no-empty
            } catch (e) {}
          }

          return ecsFieldValue ?? '-';
        }

        return !isEmpty(value) ? value : '-';
      },
    [ecsMappingColumns, getFleetAppUrl, pagination.pageSize]
  );

  const tableSorting = useMemo(
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

  const ecsMappingConfig = useMemo(() => {
    if (!ecsMapping) return;

    return reduce(
      (acc: Record<string, string[]>, [key, value]) => {
        if (value?.field) {
          acc[value?.field] = [...(acc[value?.field] ?? []), key];
        }

        return acc;
      },
      {},
      Object.entries(ecsMapping)
    );
  }, [ecsMapping]);

  const getHeaderDisplay = useCallback(
    (columnName: string) => {
      if (ecsMappingConfig && ecsMappingConfig[columnName]) {
        return (
          <>
            {columnName}{' '}
            <EuiIconTip
              size="s"
              content={
                <>
                  <FormattedMessage
                    id="xpack.osquery.liveQueryResults.table.fieldMappedLabel"
                    defaultMessage="Field is mapped to"
                  />
                  {`:`}
                  <ul>
                    {ecsMappingConfig[columnName].map((fieldName) => (
                      <li key={fieldName}>{fieldName}</li>
                    ))}
                  </ul>
                </>
              }
              type="indexMapping"
            />
          </>
        );
      }
    },
    [ecsMappingConfig]
  );

  useEffect(() => {
    if (!allResultsData?.columns.length) {
      return;
    }

    const fields = ['agent.name', ...ecsMappingColumns.sort(), ...allResultsData?.columns];

    const newColumns = fields.reduce(
      (acc, fieldName) => {
        const { data, seen } = acc;
        if (fieldName === 'agent.name') {
          if (!seen.has(fieldName)) {
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
            seen.add(fieldName);
          }

          return acc;
        }

        if (ecsMappingColumns.includes(fieldName)) {
          if (!seen.has(fieldName)) {
            data.push({
              id: fieldName,
              displayAsText: fieldName,
              defaultSortDirection: Direction.asc,
            });
            seen.add(fieldName);
          }

          return acc;
        }

        if (fieldName.startsWith('osquery.')) {
          const displayAsText = fieldName.split('.')[1];
          const hasNumberType = fields.includes(`${fieldName}.number`);
          if (!seen.has(displayAsText)) {
            const id = hasNumberType ? fieldName + '.number' : fieldName;
            data.push({
              id,
              displayAsText,
              display: getHeaderDisplay(displayAsText),
              defaultSortDirection: Direction.asc,
              ...(hasNumberType ? { schema: 'numeric' } : {}),
            });
            seen.add(displayAsText);
          }

          return acc;
        }

        return acc;
      },
      { data: [], seen: new Set<string>() } as { data: EuiDataGridColumn[]; seen: Set<string> }
    ).data;

    setColumns((currentColumns) =>
      !isEqual(map('id', currentColumns), map('id', newColumns)) ? newColumns : currentColumns
    );
    setVisibleColumns(map('id', newColumns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResultsData?.columns.length, ecsMappingColumns, getHeaderDisplay]);

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    const data = allResultsData?.edges;
    if (timelines && data) {
      return [
        {
          id: 'timeline',
          width: 38,
          headerCellRender: () => null,
          rowCellRender: (actionProps) => {
            const { visibleRowIndex } = actionProps as EuiDataGridCellValueElementProps & {
              visibleRowIndex: number;
            };
            const eventId = data[visibleRowIndex]?._id;

            return <AddToTimelineButton field="_id" value={eventId} isIcon={true} />;
          },
        },
      ];
    }

    return [];
  }, [allResultsData?.edges, timelines]);

  const toolbarVisibility = useMemo(
    () => ({
      showDisplaySelector: false,
      showFullScreenSelector: appName === OSQUERY_PLUGIN_NAME,
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
          <AddToTimelineButton field="action_id" value={actionId} />
          {liveQueryActionId && (
            <AddToCaseWrapper actionId={liveQueryActionId} queryId={actionId} agentIds={agentIds} />
          )}
        </>
      ),
    }),
    [actionId, agentIds, appName, endDate, liveQueryActionId, startDate]
  );

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || expired || error) return false;

        return !!(
          aggregations.totalResponded !== agentIds?.length ||
          allResultsData?.total !== aggregations?.totalRowCount ||
          (allResultsData?.total && !allResultsData?.edges.length)
        );
      }),
    [
      agentIds?.length,
      aggregations.totalResponded,
      aggregations?.totalRowCount,
      allResultsData?.edges.length,
      allResultsData?.total,
      error,
      expired,
    ]
  );

  if (!hasActionResultsPrivileges) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.osquery.liveQuery.permissionDeniedPromptTitle"
            defaultMessage="Permission denied"
          />
        }
        color="danger"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.osquery.liveQuery.permissionDeniedPromptBody"
            defaultMessage="To view query results, ask your administrator to update your user role to have index {read} privileges on the {logs} index."
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            values={{
              read: <EuiCode>read</EuiCode>,
              logs: <EuiCode>logs-{OSQUERY_INTEGRATION_NAME}.result*</EuiCode>,
            }}
          />
        </p>
      </EuiCallOut>
    );
  }

  if (isLoading) {
    return <EuiLoadingContent lines={5} />;
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" />}

      {!allResultsData?.edges.length ? (
        <EuiPanel hasShadow={false}>
          <EuiCallOut title={generateEmptyDataMessage(aggregations.totalResponded)} />
        </EuiPanel>
      ) : (
        <DataContext.Provider value={allResultsData?.edges}>
          <StyledEuiDataGrid
            data-test-subj="osqueryResultsTable"
            aria-label="Osquery results"
            columns={columns}
            columnVisibility={columnVisibility}
            rowCount={allResultsData?.total ?? 0}
            renderCellValue={renderCellValue}
            leadingControlColumns={leadingControlColumns}
            sorting={tableSorting}
            pagination={tablePagination}
            toolbarVisibility={toolbarVisibility}
          />
        </DataContext.Provider>
      )}
    </>
  );
};

export const ResultsTable = React.memo(ResultsTableComponent);
