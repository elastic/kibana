/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import { orderBy } from 'lodash';
import React, { useState } from 'react';
import uuid from 'uuid';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { InstancesLatencyDistributionChart } from '../../shared/charts/instances_latency_distribution_chart';
import { getTimeRangeComparison } from '../../shared/time_comparison/get_time_range_comparison';
import {
  ServiceOverviewInstancesTable,
  TableOptions,
} from './service_overview_instances_table';

interface ServiceOverviewInstancesChartAndTableProps {
  chartHeight: number;
  serviceName: string;
}

export interface MainStatsServiceInstanceItem {
  serviceNodeName: string;
  errorRate: number;
  throughput: number;
  latency: number;
  cpuUsage: number;
  memoryUsage: number;
}
type ApiResponseMainStats = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type ApiResponseDetailedStats = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;

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

export type SortField =
  | 'serviceNodeName'
  | 'latency'
  | 'throughput'
  | 'errorRate'
  | 'cpuUsage'
  | 'memoryUsage';

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
  const { transactionType } = useApmServiceContext();
  const [tableOptions, setTableOptions] = useState<TableOptions>({
    pageIndex: 0,
    sort: DEFAULT_SORT,
  });

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const {
    urlParams: {
      environment,
      kuery,
      latencyAggregationType,
      start,
      end,
      comparisonType,
      comparisonEnabled,
    },
  } = useUrlParams();

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const {
    data: mainStatsData = INITIAL_STATE_MAIN_STATS,
    status: mainStatsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType || !latencyAggregationType) {
        return;
      }

      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics',
        params: {
          path: {
            serviceName,
          },
          query: {
            environment,
            kuery,
            latencyAggregationType,
            start,
            end,
            transactionType,
            comparisonStart,
            comparisonEnd,
          },
        },
      }).then((response) => {
        return {
          // Everytime the main statistics is refetched, updates the requestId making the detailed API to be refetched.
          requestId: uuid(),
          currentPeriodItems: response.currentPeriod,
          currentPeriodItemsCount: response.currentPeriod.length,
          previousPeriodItems: response.previousPeriod,
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
      pageIndex,
      field,
      direction,
      // not used, but needed to trigger an update when comparisonType is changed either manually by user or when time range is changed
      comparisonType,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const {
    currentPeriodItems,
    previousPeriodItems,
    requestId,
    currentPeriodItemsCount,
  } = mainStatsData;

  const currentPeriodOrderedItems = orderBy(
    // need top-level sortable fields for the managed table
    currentPeriodItems.map((item) => ({
      ...item,
      latency: item.latency ?? 0,
      throughput: item.throughput ?? 0,
      errorRate: item.errorRate ?? 0,
      cpuUsage: item.cpuUsage ?? 0,
      memoryUsage: item.memoryUsage ?? 0,
    })),
    field,
    direction
  ).slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

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

      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
        params: {
          path: {
            serviceName,
          },
          query: {
            environment,
            kuery,
            latencyAggregationType,
            start,
            end,
            numBuckets: 20,
            transactionType,
            serviceNodeIds: JSON.stringify(
              currentPeriodOrderedItems.map((item) => item.serviceNodeName)
            ),
            comparisonStart,
            comparisonEnd,
          },
        },
      });
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
            mainStatsItems={currentPeriodOrderedItems}
            mainStatsStatus={mainStatsStatus}
            mainStatsItemCount={currentPeriodItemsCount}
            detailedStatsData={detailedStatsData}
            serviceName={serviceName}
            tableOptions={tableOptions}
            isLoading={
              mainStatsStatus === FETCH_STATUS.LOADING ||
              detailedStatsStatus === FETCH_STATUS.LOADING
            }
            onChangeTableOptions={(newTableOptions) => {
              setTableOptions({
                pageIndex: newTableOptions.page?.index ?? 0,
                sort: newTableOptions.sort
                  ? {
                      field: newTableOptions.sort.field as SortField,
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
