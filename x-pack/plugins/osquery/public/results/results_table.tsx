/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty, isArray, isObject, isEqual, keys, map, reduce } from 'lodash/fp';
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
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
} from '../packs/pack_queries_status_table';
import { useActionResultsPrivileges } from '../action_results/use_action_privileges';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { useActionDetails } from '../actions/use_action_details';

const DataContext = createContext<ResultEdges>([]);

interface ResultsTableComponentProps {
  actionId: string;
  selectedAgent?: string;
  agentIds?: string[];
  endDate?: string;
  startDate?: string;
  hideFullscreen?: true;
}

const ResultsTableComponent: React.FC<ResultsTableComponentProps> = ({
  actionId,
  agentIds,
  startDate,
  endDate,
  hideFullscreen,
}) => {
  const [isLive, setIsLive] = useState(true);
  const { data: hasActionResultsPrivileges } = useActionResultsPrivileges();
  const { data: actionDetails } = useActionDetails({ actionId });

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

  const {
    data: allResultsData,
    isFetched,
    isLoading,
  } = useAllResults({
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

  const ecsMappingColumns = useMemo(
    () => keys(get('actionDetails._source.data.ecs_mapping', actionDetails) || {}),
    [actionDetails]
  );

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

  const ecsMapping = useMemo(() => {
    const mapping = get('actionDetails._source.data.ecs_mapping', actionDetails);
    if (!mapping) return;

    return reduce(
      (acc, [key, value]) => {
        // @ts-expect-error update types
        if (value?.field) {
          // @ts-expect-error update types
          acc[value?.field] = [...(acc[value?.field] ?? []), key];
        }

        return acc;
      },
      {},
      Object.entries(mapping)
    );
  }, [actionDetails]);

  const getHeaderDisplay = useCallback(
    (columnName: string) => {
      // @ts-expect-error update types
      if (ecsMapping && ecsMapping[columnName]) {
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
                    {
                      // @ts-expect-error update types
                      ecsMapping[columnName].map((fieldName) => (
                        <li key={fieldName}>{fieldName}</li>
                      ))
                    }
                  </ul>
                </>
              }
              type="indexMapping"
            />
          </>
        );
      }
    },
    [ecsMapping]
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

  const toolbarVisibility = useMemo(
    () => ({
      showDisplaySelector: false,
      showFullScreenSelector: !hideFullscreen,
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
    [actionId, endDate, startDate, hideFullscreen]
  );

  useEffect(
    () =>
      setIsLive(() => {
        if (!agentIds?.length || expired) return false;

        return !!(aggregations.totalResponded !== agentIds?.length);
      }),
    [agentIds?.length, aggregations.failed, aggregations.totalResponded, expired]
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

  if (isLoading) {
    return <EuiLoadingContent lines={5} />;
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" />}

      {isFetched && !allResultsData?.edges.length && !aggregations?.totalRowCount ? (
        <>
          <EuiCallOut title={generateEmptyDataMessage(aggregations.totalResponded)} />
          <EuiSpacer />
        </>
      ) : (
        // @ts-expect-error update types
        <DataContext.Provider value={allResultsData?.edges}>
          <EuiDataGrid
            data-test-subj="osqueryResultsTable"
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
