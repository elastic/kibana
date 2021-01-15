/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React from 'react';
import { ValuesType } from 'utility-types';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { InstancesLatencyDistributionChart } from '../../shared/charts/instances_latency_distribution_chart';
import { ServiceOverviewInstancesTable } from './service_overview_instances_table';

export type ServiceInstanceItem = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances'>
> & {
  cpuUsageValue: number;
  errorRateValue: number;
  latencyValue: number;
  memoryUsageValue: number;
  throughputValue: number;
};

interface ServiceOverviewInstancesRowProps {
  chartHeight: number;
  serviceName: string;
}

export function ServiceOverviewInstancesRow({
  chartHeight,
  serviceName,
}: ServiceOverviewInstancesRowProps) {
  const { transactionType } = useApmServiceContext();

  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();

  const { data = [], status } = useFetcher(() => {
    if (!start || !end || !transactionType) {
      return;
    }

    return callApmApi({
      endpoint:
        'GET /api/apm/services/{serviceName}/service_overview_instances',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
          transactionType,
          uiFilters: JSON.stringify(uiFilters),
          numBuckets: 20,
        },
      },
    });
  }, [start, end, serviceName, transactionType, uiFilters]);

  // need top-level sortable fields for the managed table
  const items = data.map((item) => ({
    ...item,
    latencyValue: item.latency?.value ?? 0,
    throughputValue: item.throughput?.value ?? 0,
    errorRateValue: item.errorRate?.value ?? 0,
    cpuUsageValue: item.cpuUsage?.value ?? 0,
    memoryUsageValue: item.memoryUsage?.value ?? 0,
  }));

  return (
    <>
      <EuiFlexItem grow={3}>
        <InstancesLatencyDistributionChart
          height={chartHeight}
          items={items}
          status={status}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <ServiceOverviewInstancesTable
            items={items}
            serviceName={serviceName}
            status={status}
          />
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
}
