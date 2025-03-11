/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useErrorGroupDistributionFetcher } from '../../../../hooks/use_error_group_distribution_fetcher';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { HttpErrorRateChart } from '../charts/mobile_http_error_rate';
import { ErrorDistribution } from '../errors_and_crashes_group_details/shared/distribution';
import { MobileErrorGroupList } from './error_group_list';
import { MobileErrorsAndCrashesTreemap } from '../charts/mobile_errors_and_crashes_treemap';
import {
  getKueryWithMobileErrorFilter,
  getKueryWithMobileFilters,
} from '../../../../../common/utils/get_kuery_with_mobile_filters';

type MobileErrorGroupMainStatistics =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics'>;
type MobileErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATISTICS: {
  mobileErrorGroupMainStatistics: MobileErrorGroupMainStatistics['errorGroups'];
  requestId?: string;
  currentPageGroupIds: MobileErrorGroupMainStatistics['errorGroups'];
} = {
  mobileErrorGroupMainStatistics: [],
  requestId: undefined,
  currentPageGroupIds: [],
};

const INITIAL_STATE_DETAILED_STATISTICS: MobileErrorGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function MobileErrorsOverview() {
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
      device,
      osVersion,
      appVersion,
      netConnectionType,
    },
  } = useApmParams('/mobile-services/{serviceName}/errors-and-crashes');
  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { errorDistributionData, errorDistributionStatus: status } =
    useErrorGroupDistributionFetcher({
      serviceName,
      groupId: undefined,
      environment,
      kuery: kueryWithMobileFilters,
    });
  const {
    data: errorGroupListData = INITIAL_STATE_MAIN_STATISTICS,
    status: errorGroupListDataStatus,
  } = useFetcher(
    (callApmApi) => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (start && end) {
        return callApmApi(
          'GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                environment,
                kuery: kueryWithMobileFilters,
                start,
                end,
                sortField,
                sortDirection: normalizedSortDirection,
              },
            },
          }
        ).then((response) => {
          const currentPageGroupIds = orderBy(response.errorGroups, sortField, sortDirection)
            .slice(page * pageSize, (page + 1) * pageSize)
            .map(({ groupId }) => groupId)
            .sort();

          return {
            // Everytime the main statistics is refetched, updates the requestId making the comparison API to be refetched.
            requestId: uuidv4(),
            mobileErrorGroupMainStatistics: response.errorGroups,
            currentPageGroupIds,
          };
        });
      }
    },
    [
      environment,
      kueryWithMobileFilters,
      serviceName,
      start,
      end,
      sortField,
      sortDirection,
      page,
      pageSize,
    ]
  );
  const { requestId, mobileErrorGroupMainStatistics, currentPageGroupIds } = errorGroupListData;
  const {
    data: mobileErrorGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: mobileErrorGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && currentPageGroupIds.length && start && end) {
        return callApmApi(
          'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery: kueryWithMobileFilters,
                start,
                end,
                numBuckets: 20,
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
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
  const kueryForTreemap = getKueryWithMobileErrorFilter({
    kuery: kueryWithMobileFilters,
    groupId: undefined,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <ChartPointerEventContextProvider>
                <EuiFlexItem>
                  <ErrorDistribution
                    fetchStatus={status}
                    distribution={errorDistributionData}
                    height={150}
                    title={i18n.translate('xpack.apm.serviceDetails.metrics.errorRateChart.title', {
                      defaultMessage: 'Error rate',
                    })}
                    tip={i18n.translate('xpack.apm.serviceDetails.metrics.errorRateChart.tip', {
                      defaultMessage: `Error rate is measured in transactions per minute.`,
                    })}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <HttpErrorRateChart
                    height={150}
                    kuery={kueryWithMobileFilters}
                    serviceName={serviceName}
                    comparisonEnabled={comparisonEnabled}
                    start={start}
                    end={end}
                    offset={offset}
                    environment={environment}
                  />
                </EuiFlexItem>
              </ChartPointerEventContextProvider>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <MobileErrorsAndCrashesTreemap
              serviceName={serviceName}
              kuery={kueryForTreemap}
              environment={environment}
              start={start}
              end={end}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.serviceDetails.metrics.errorsList.title', {
                defaultMessage: 'Errors',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <MobileErrorGroupList
            mainStatistics={mobileErrorGroupMainStatistics}
            serviceName={serviceName}
            detailedStatisticsLoading={isPending(mobileErrorGroupDetailedStatisticsStatus)}
            detailedStatistics={mobileErrorGroupDetailedStatistics}
            comparisonEnabled={comparisonEnabled}
            initialSortField={sortField}
            initialSortDirection={sortDirection}
            isLoading={errorGroupListDataStatus === FETCH_STATUS.LOADING}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
