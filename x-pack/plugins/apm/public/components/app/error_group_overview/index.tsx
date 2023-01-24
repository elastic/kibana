/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { orderBy } from 'lodash';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { ErrorDistribution } from '../error_group_details/distribution';
import { ErrorGroupList } from './error_group_list';

type ErrorGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATISTICS: {
  errorGroupMainStatistics: ErrorGroupMainStatistics['errorGroups'];
  requestId?: string;
  currentPageGroupIds: ErrorGroupMainStatistics['errorGroups'];
} = {
  errorGroupMainStatistics: [],
  requestId: undefined,
  currentPageGroupIds: [],
};

const INITIAL_STATE_DETAILED_STATISTICS: ErrorGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function ErrorGroupOverview() {
  const { serviceName } = useApmServiceContext();

  const {
    query: {
      environment,
      kuery,
      sortField = 'occurrences',
      sortDirection = 'desc',
      rangeFrom,
      rangeTo,
      offset,
      comparisonEnabled,
      page = 0,
      pageSize = 25,
    },
  } = useApmParams('/services/{serviceName}/errors');

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
          ).then((response) => {
            const currentPageGroupIds = orderBy(
              response.errorGroups,
              sortField,
              sortDirection
            )
              .slice(page * pageSize, (page + 1) * pageSize)
              .map(({ groupId }) => groupId)
              .sort();

            return {
              // Everytime the main statistics is refetched, updates the requestId making the comparison API to be refetched.
              requestId: uuidv4(),
              errorGroupMainStatistics: response.errorGroups,
              currentPageGroupIds,
            };
          });
        }
      },
      [
        environment,
        kuery,
        serviceName,
        start,
        end,
        sortField,
        sortDirection,
        page,
        pageSize,
      ]
    );

  const { requestId, errorGroupMainStatistics, currentPageGroupIds } =
    errorGroupListData;

  const {
    data: errorGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: errorGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && currentPageGroupIds.length && start && end) {
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
                groupIds: JSON.stringify(currentPageGroupIds),
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

          <ErrorGroupList
            mainStatistics={errorGroupMainStatistics}
            serviceName={serviceName}
            detailedStatisticsLoading={isPending(
              errorGroupDetailedStatisticsStatus
            )}
            detailedStatistics={errorGroupDetailedStatistics}
            comparisonEnabled={comparisonEnabled}
            initialSortField={sortField}
            initialSortDirection={sortDirection}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
