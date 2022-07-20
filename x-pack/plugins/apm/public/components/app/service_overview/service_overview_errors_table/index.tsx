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
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { getColumns } from '../../../shared/errors_table/get_columns';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useTableSortAndPagination } from '../../../../hooks/table_sort_pagination/use_table_sort_pagination';

interface Props {
  serviceName: string;
}
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

const SORT_FIELD = 'occurrences';

export function ServiceOverviewErrorsTable({ serviceName }: Props) {
  const { query } = useApmParams('/services/{serviceName}/overview');

  const { environment, kuery, rangeFrom, rangeTo, offset, comparisonEnabled } =
    query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE_MAIN_STATISTICS, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
        {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        }
      );
    },
    [environment, kuery, start, end, serviceName]
  );

  const { requestId, tableItems, onTableChange, tablePagination, tableSort } =
    useTableSortAndPagination(
      { items: data.errorGroups, sorting: { sort: { field: 'occurrences' } } },
      [offset, comparisonEnabled]
    );

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
                  tableItems.map(({ groupId: groupId }) => groupId)
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

  const errorGroupDetailedStatisticsLoading =
    errorGroupDetailedStatisticsStatus === FETCH_STATUS.LOADING;

  const columns = getColumns({
    serviceName,
    errorGroupDetailedStatisticsLoading,
    errorGroupDetailedStatistics,
    comparisonEnabled,
    query,
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="serviceOverviewErrorsTable"
    >
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
                  defaultMessage: 'Errors',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrorOverviewLink serviceName={serviceName} query={query}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer
          fixedHeight={true}
          isEmptyAndNotInitiated={
            data.errorGroups.length === 0 &&
            status === FETCH_STATUS.NOT_INITIATED
          }
        >
          <EuiBasicTable
            error={
              status === FETCH_STATUS.FAILURE
                ? i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.errorMessage',
                    { defaultMessage: 'Failed to fetch' }
                  )
                : ''
            }
            noItemsMessage={
              status === FETCH_STATUS.LOADING
                ? i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.loading',
                    { defaultMessage: 'Loading...' }
                  )
                : i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.noResults',
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
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
