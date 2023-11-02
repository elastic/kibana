/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useCrashGroupDistributionFetcher } from '../../../../hooks/use_crash_group_distribution_fetcher';
import { MobileCrashesTreemap } from '../charts/mobile_crashes_treemap';
import { MobileCrashGroupList } from './crash_group_list';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { ErrorDistribution } from '../error_group_details/distribution';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';

type MobileCrashGroupMainStatistics =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics'>;
type MobileCrashGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATISTICS: {
  mobileCrashGroupMainStatistics: MobileCrashGroupMainStatistics['errorGroups'];
  requestId?: string;
  currentPageGroupIds: MobileCrashGroupMainStatistics['errorGroups'];
} = {
  mobileCrashGroupMainStatistics: [],
  requestId: undefined,
  currentPageGroupIds: [],
};

const INITIAL_STATE_DETAILED_STATISTICS: MobileCrashGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function MobileCrashGroupOverview() {
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
  } = useApmParams('/mobile-services/{serviceName}/errors');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { crashDistributionData, status } = useCrashGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery,
  });

  const {
    data: crashGroupListData = INITIAL_STATE_MAIN_STATISTICS,
    status: crashGroupListDataStatus,
  } = useFetcher(
    (callApmApi) => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (start && end) {
        return callApmApi(
          'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics',
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
            mobileCrashGroupMainStatistics: response.errorGroups,
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

  const { requestId, mobileCrashGroupMainStatistics, currentPageGroupIds } =
    crashGroupListData;
  const {
    data: mobileCrashGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: mobileCrashGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && currentPageGroupIds.length && start && end) {
        return callApmApi(
          'POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics',
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
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <ChartPointerEventContextProvider>
                <EuiFlexItem>
                  <EuiPanel hasBorder={true}>
                    <ErrorDistribution
                      fetchStatus={status}
                      distribution={crashDistributionData}
                      height={375}
                      title={i18n.translate(
                        'xpack.apm.serviceDetails.metrics.crashOccurrencesChart.title',
                        { defaultMessage: 'Crash occurrences' }
                      )}
                      tip={i18n.translate(
                        'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.tip',
                        {
                          defaultMessage: `Crash occurrence is measured in crashes per minute.`,
                        }
                      )}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </ChartPointerEventContextProvider>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <MobileCrashesTreemap
                serviceName={serviceName}
                kuery={kuery}
                environment={environment}
                start={start}
                end={end}
              />
            </EuiPanel>
          </EuiFlexItem>
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

          <MobileCrashGroupList
            mainStatistics={mobileCrashGroupMainStatistics}
            serviceName={serviceName}
            detailedStatisticsLoading={isPending(
              mobileCrashGroupDetailedStatisticsStatus
            )}
            detailedStatistics={mobileCrashGroupDetailedStatistics}
            comparisonEnabled={comparisonEnabled}
            initialSortField={sortField}
            initialSortDirection={sortDirection}
            isLoading={crashGroupListDataStatus === FETCH_STATUS.LOADING}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
