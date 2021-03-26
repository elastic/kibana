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
import { getTimeRangeComparison } from '../../shared/time_comparison/get_time_range_comparison';
import {
  ServiceOverviewInstancesTable,
  TableOptions,
} from './service_overview_instances_table';

// We're hiding this chart until these issues are resolved in the 7.13 timeframe:
//
// * [[APM] Tooltips for instances latency distribution chart](https://github.com/elastic/kibana/issues/88852)
// * [[APM] x-axis on the instance bubble chart is broken](https://github.com/elastic/kibana/issues/92631)
//
// import { InstancesLatencyDistributionChart } from '../../shared/charts/instances_latency_distribution_chart';

interface ServiceOverviewInstancesChartAndTableProps {
  chartHeight: number;
  serviceName: string;
}

const INITIAL_STATE = {
  items: [] as Array<{
    serviceNodeName: string;
    errorRate: number;
    throughput: number;
    latency: number;
    cpuUsage: number;
    memoryUsage: number;
  }>,
  requestId: undefined,
  totalItems: 0,
};

const INITIAL_STATE_COMPARISON_STATISTICS = {
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
    },
  } = useUrlParams();

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType || !latencyAggregationType) {
        return;
      }

      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics',
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
          },
        },
      }).then((response) => {
        const tableItems = orderBy(
          // need top-level sortable fields for the managed table
          response.map((item) => ({
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

        return {
          requestId: uuid(),
          items: tableItems,
          totalItems: response.length,
        };
      });
    },
    // comparisonType is listed as dependency even thought it is not used. This is needed to trigger the comparison api when it is changed.
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
      comparisonType,
    ]
  );

  const { items, requestId, totalItems } = data;

  const {
    data: comparisonStatistics = INITIAL_STATE_COMPARISON_STATISTICS,
    status: comparisonStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (
        !start ||
        !end ||
        !transactionType ||
        !latencyAggregationType ||
        !totalItems
      ) {
        return;
      }

      return callApmApi({
        endpoint:
          'GET /api/apm/services/{serviceName}/service_overview_instances/comparison_statistics',
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
              items.map((item) => item.serviceNodeName)
            ),
            comparisonStart,
            comparisonEnd,
          },
        },
      });
    },
    // only fetches comparison statistics when requestId is invalidated by primary statistics api call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  return (
    <>
      {/* <EuiFlexItem grow={3}>
        <InstancesLatencyDistributionChart
          height={chartHeight}
          items={data.items}
          status={status}
        />
      </EuiFlexItem> */}
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <ServiceOverviewInstancesTable
            items={items}
            serviceName={serviceName}
            status={status}
            tableOptions={tableOptions}
            totalItems={totalItems}
            serviceInstanceComparisonStatistics={comparisonStatistics}
            isLoading={
              status === FETCH_STATUS.LOADING ||
              comparisonStatisticsStatus === FETCH_STATUS.LOADING
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
