/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { InstancesLatencyDistributionChart } from '../../../shared/charts/instances_latency_distribution_chart';
import type { TableOptions } from '../service_overview_instances_table';
import { ServiceOverviewInstancesTable } from '../service_overview_instances_table';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { InstancesSortField } from '../../../../../common/instances';

interface ServiceOverviewInstancesChartAndTableProps {
  chartHeight: number;
  serviceName: string;
}

type ApiResponseMainStats =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type ApiResponseDetailedStats =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;

const INITIAL_STATE_MAIN_STATS = {
  currentPeriodItems: [] as ApiResponseMainStats['currentPeriod'],
  previousPeriodItems: [] as ApiResponseMainStats['previousPeriod'],
  requestId: undefined,
  currentPeriodItemsCount: 0,
};

const INITIAL_STATE_DETAILED_STATISTICS: ApiResponseDetailedStats = {
  currentPeriod: {},
  previousPeriod: {},
};

export type SortDirection = 'asc' | 'desc';
export const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'throughput' as const,
};

export function ServiceOverviewInstancesChartAndTable({
  chartHeight,
  serviceName,
}: ServiceOverviewInstancesChartAndTableProps) {
  const { transactionType, transactionTypeStatus } = useApmServiceContext();
  const [tableOptions, setTableOptions] = useState<TableOptions>({
    pageIndex: 0,
    sort: DEFAULT_SORT,
  });

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      comparisonEnabled,
      offset,
      latencyAggregationType,
    },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: mainStatsData = INITIAL_STATE_MAIN_STATS, status: mainStatsStatus } = useFetcher(
    (callApmApi) => {
      if (!transactionType && transactionTypeStatus === FETCH_STATUS.SUCCESS) {
        return Promise.resolve(INITIAL_STATE_MAIN_STATS);
      }

      if (!start || !end || !transactionType || !latencyAggregationType) {
        return;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              latencyAggregationType: latencyAggregationType as LatencyAggregationType,
              start,
              end,
              transactionType,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              sortField: tableOptions.sort.field,
              sortDirection: tableOptions.sort.direction,
            },
          },
        }
      ).then((response) => {
        return {
          // Everytime the main statistics is refetched, updates the requestId making the detailed API to be refetched.
          requestId: uuidv4(),
          currentPeriodItems: response?.currentPeriod ?? [],
          currentPeriodItemsCount: response?.currentPeriod.length,
          previousPeriodItems: response?.previousPeriod,
        };
      });
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      latencyAggregationType,
      start,
      end,
      serviceName,
      transactionType,
      transactionTypeStatus,
      pageIndex,
      field,
      direction,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
      tableOptions.sort,
    ]
  );

  const { currentPeriodItems, previousPeriodItems, requestId, currentPeriodItemsCount } =
    mainStatsData;

  const currentPageItems = currentPeriodItems.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  );

  const {
    data: detailedStatsData = INITIAL_STATE_DETAILED_STATISTICS,
    status: detailedStatsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (
        !start ||
        !end ||
        !transactionType ||
        !latencyAggregationType ||
        !currentPeriodItemsCount
      ) {
        return;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              latencyAggregationType: latencyAggregationType as LatencyAggregationType,
              start,
              end,
              numBuckets: 20,
              transactionType,
              serviceNodeIds: JSON.stringify(currentPageItems.map((item) => item.serviceNodeName)),
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        }
      );
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  return (
    <>
      <EuiFlexItem grow={3}>
        <InstancesLatencyDistributionChart
          height={chartHeight}
          items={currentPeriodItems}
          status={mainStatsStatus}
          comparisonItems={previousPeriodItems}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiPanel hasBorder={true}>
          <ServiceOverviewInstancesTable
            mainStatsItems={currentPageItems}
            mainStatsStatus={mainStatsStatus}
            mainStatsItemCount={currentPeriodItemsCount}
            detailedStatsLoading={isPending(detailedStatsStatus)}
            detailedStatsData={detailedStatsData}
            serviceName={serviceName}
            tableOptions={tableOptions}
            isLoading={mainStatsStatus === FETCH_STATUS.LOADING}
            isNotInitiated={mainStatsStatus === FETCH_STATUS.NOT_INITIATED}
            onChangeTableOptions={(newTableOptions) => {
              setTableOptions({
                pageIndex: newTableOptions.page?.index ?? 0,
                sort: newTableOptions.sort
                  ? {
                      field: newTableOptions.sort.field as InstancesSortField,
                      direction: newTableOptions.sort.direction,
                    }
                  : DEFAULT_SORT,
              });
            }}
          />
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
}
