/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ServiceOverviewInstancesTable } from './service_overview_instances_table';

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

export function ServiceOverviewInstancesChartAndTable({
  chartHeight,
  serviceName,
}: ServiceOverviewInstancesChartAndTableProps) {
  const { transactionType } = useApmServiceContext();

  const {
    urlParams: { environment, latencyAggregationType, start, end },
    uiFilters,
  } = useUrlParams();

  const { data = [], status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType || !latencyAggregationType) {
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
            environment,
            latencyAggregationType,
            start,
            end,
            transactionType,
            uiFilters: JSON.stringify(uiFilters),
            numBuckets: 20,
          },
        },
      });
    },
    [
      environment,
      latencyAggregationType,
      start,
      end,
      serviceName,
      transactionType,
      uiFilters,
    ]
  );

  return (
    <>
      {/* <EuiFlexItem grow={3}>
        <InstancesLatencyDistributionChart
          height={chartHeight}
          items={data}
          status={status}
        />
      </EuiFlexItem> */}
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <ServiceOverviewInstancesTable
            items={data}
            serviceName={serviceName}
            status={status}
          />
        </EuiPanel>
      </EuiFlexItem>
    </>
  );
}
