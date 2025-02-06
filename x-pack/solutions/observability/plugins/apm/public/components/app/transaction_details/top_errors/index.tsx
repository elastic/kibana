/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getColumns } from '../../../shared/errors_table/get_columns';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

type ErrorGroupMainStatisticsByTransactionName =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'>;

type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATISTICS: {
  items: ErrorGroupMainStatisticsByTransactionName['errorGroups'];
  requestId?: string;
} = {
  items: [],
  requestId: undefined,
};

const INITIAL_STATE_DETAILED_STATISTICS: ErrorGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function TopErrors() {
  const {
    query,
    path: { serviceName },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const {
    environment,
    kuery,
    rangeFrom,
    rangeTo,
    offset,
    comparisonEnabled,
    transactionName,
    transactionType,
  } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE_MAIN_STATISTICS, status } = useFetcher(
    (callApmApi) => {
      if (start && end && transactionType) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                transactionName,
                transactionType,
                maxNumberOfErrorGroups: 5,
              },
            },
          }
        ).then((response) => {
          return {
            // Everytime the main statistics is refetched, updates the requestId making the comparison API to be refetched.
            requestId: uuidv4(),
            items: response.errorGroups,
          };
        });
      }
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      start,
      end,
      serviceName,
      transactionName,
      transactionType,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const { requestId, items } = data;

  const {
    data: errorGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: errorGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && items.length && start && end) {
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
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              },
              body: {
                groupIds: JSON.stringify(items.map(({ groupId: groupId }) => groupId).sort()),
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
    showErrorType: false,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="topErrorsForTransactionTable">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.apm.transactionDetails.topErrors.title', {
              defaultMessage: 'Top 5 errors',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          error={
            status === FETCH_STATUS.FAILURE
              ? i18n.translate('xpack.apm.transactionDetails.topErrors.errorMessage', {
                  defaultMessage: 'Failed to fetch errors',
                })
              : ''
          }
          noItemsMessage={
            status === FETCH_STATUS.LOADING
              ? i18n.translate('xpack.apm.transactionDetails.topErrors.loading', {
                  defaultMessage: 'Loading...',
                })
              : i18n.translate('xpack.apm.transactionDetails.topErrors.noResults', {
                  defaultMessage: 'No errors found for this transaction group',
                })
          }
          columns={columns}
          items={items}
          loading={status === FETCH_STATUS.LOADING}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
