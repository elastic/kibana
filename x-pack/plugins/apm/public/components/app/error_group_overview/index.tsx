/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTableSortAndPaginationUrl } from '../../../hooks/table_sort_pagination/use_table_sort_pagination_url';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { ErrorDistribution } from '../error_group_details/distribution';
import { getColumns } from './get_columns';

type ErrorGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATISTICS: ErrorGroupMainStatistics = {
  errorGroups: [],
};

const INITIAL_STATE_DETAILED_STATISTICS: ErrorGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

const PAGE_INDEX = 0;
const PAGE_SIZE = 25;
const SORT_FIELD = 'occurrences';
const SORT_DIRECTION = 'desc';

export function ErrorGroupOverview() {
  const { serviceName } = useApmServiceContext();

  const { query } = useApmParams('/services/{serviceName}/errors');
  const {
    environment,
    kuery,
    sortField,
    sortDirection,
    rangeFrom,
    rangeTo,
    offset,
    comparisonEnabled,
    page,
    pageSize,
  } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { errorDistributionData, status } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery,
  });

  const { data: errorGroupListData = INITIAL_STATE_MAIN_STATISTICS } =
    useFetcher(
      (callApmApi) => {
        const normalizedSortDirection =
          sortDirection === 'asc' ? 'asc' : 'desc';

        if (start && end) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
            {
              params: {
                path: {
                  serviceName,
                },
                query: {
                  environment,
                  kuery,
                  start,
                  end,
                  sortField,
                  sortDirection: normalizedSortDirection,
                },
              },
            }
          );
        }
      },
      [environment, kuery, serviceName, start, end, sortField, sortDirection]
    );

  const { errorGroups } = errorGroupListData;

  const { tableItems, tablePagination, tableSort, onTableChange, requestId } =
    useTableSortAndPaginationUrl<typeof errorGroups>({
      items: errorGroups,
      pagination: {
        pageIndex: page || PAGE_INDEX,
        pageSize: pageSize || PAGE_SIZE,
        showPerPageOptions: true,
      },
      sorting: {
        sort: {
          field: sortField
            ? (sortField as keyof ErrorGroupMainStatistics['errorGroups'][0])
            : SORT_FIELD,
          direction: sortDirection || SORT_DIRECTION,
        },
        enableAllColumns: true,
      },
    });

  const {
    data: errorGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: errorGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && tableItems.length && start && end) {
        return callApmApi(
          'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                numBuckets: 20,
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
              },
              body: {
                groupIds: JSON.stringify(
                  tableItems.map(({ groupId }) => groupId)
                ),
              },
            },
          }
        );
      }
    },
    // only fetches agg results when requestId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  const columns = useMemo(
    () =>
      getColumns({
        serviceName,
        detailedStatisticsLoading:
          errorGroupDetailedStatisticsStatus === FETCH_STATUS.LOADING ||
          errorGroupDetailedStatisticsStatus === FETCH_STATUS.NOT_INITIATED,
        detailedStatistics: errorGroupDetailedStatistics,
        comparisonEnabled,
        query,
      }),
    [
      serviceName,
      errorGroupDetailedStatisticsStatus,
      errorGroupDetailedStatistics,
      comparisonEnabled,
      query,
    ]
  );

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <ChartPointerEventContextProvider>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <ErrorDistribution
                  fetchStatus={status}
                  distribution={errorDistributionData}
                  title={i18n.translate(
                    'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.title',
                    { defaultMessage: 'Error occurrences' }
                  )}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <FailedTransactionRateChart kuery={kuery} />
            </EuiFlexItem>
          </ChartPointerEventContextProvider>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.apm.serviceDetails.metrics.errorsList.title',
                { defaultMessage: 'Errors' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <EuiBasicTable
            error={
              status === FETCH_STATUS.FAILURE
                ? i18n.translate('xpack.apm.errorsTable.errorMessage', {
                    defaultMessage: 'Failed to fetch',
                  })
                : ''
            }
            noItemsMessage={
              status === FETCH_STATUS.LOADING
                ? i18n.translate(
                    'xpack.apm.errorsTable.noErrorsLabel.loading',
                    { defaultMessage: 'Loading...' }
                  )
                : i18n.translate(
                    'xpack.apm.errorsTable.noErrorsLabel.noResults',
                    { defaultMessage: 'No errors found' }
                  )
            }
            columns={columns}
            items={tableItems}
            pagination={tablePagination}
            loading={status === FETCH_STATUS.LOADING}
            onChange={onTableChange}
            sorting={tableSort}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
