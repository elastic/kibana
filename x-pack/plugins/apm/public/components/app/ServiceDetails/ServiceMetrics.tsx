/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
// @ts-ignore
import Distribution from 'x-pack/plugins/apm/public/components/app/ErrorGroupDetails/Distribution';
import { SyncChartGroup } from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { TransactionCharts } from 'x-pack/plugins/apm/public/components/shared/charts/TransactionCharts';
import { ErrorDistributionRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/errorDistribution';
import { MetricsChartDataRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceMetricsCharts';
import { TransactionOverviewChartsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { CPUUsageChart } from './CPUUsageChart';
import { MemoryUsageChart } from './MemoryUsageChart';

interface ServiceMetricsProps {
  serviceName: string;
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
  chartWrapper?: React.ComponentClass | React.SFC;
}

export const ServiceMetrics: React.SFC<ServiceMetricsProps> = ({
  serviceName,
  urlParams,
  serviceTransactionTypes,
  chartWrapper: ChartWrapper = React.Fragment
}) => {
  const params = { serviceName, ...urlParams };
  if (serviceTransactionTypes.length !== 1) {
    delete params.transactionType;
  }
  return (
    <React.Fragment>
      <TransactionOverviewChartsRequest
        urlParams={params}
        render={({ data }) => (
          <TransactionCharts
            charts={data}
            urlParams={params}
            location={location}
            chartWrapper={ChartWrapper}
          />
        )}
      />

      <EuiSpacer size="xxl" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <ChartWrapper>
            <ErrorDistributionRequest
              urlParams={params}
              render={({ data }) => (
                <Distribution
                  distribution={data}
                  title={
                    <EuiTitle size="s">
                      <span>Error occurrences</span>
                    </EuiTitle>
                  }
                />
              )}
            />
          </ChartWrapper>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <MetricsChartDataRequest
        urlParams={params}
        render={({ data }) => {
          return (
            <SyncChartGroup
              render={chartGroupProps => (
                <EuiFlexGrid columns={2}>
                  <EuiFlexItem>
                    <ChartWrapper>
                      <CPUUsageChart
                        data={data.cpu}
                        chartGroupProps={chartGroupProps}
                      />
                    </ChartWrapper>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ChartWrapper>
                      <MemoryUsageChart
                        data={data.memory}
                        chartGroupProps={chartGroupProps}
                      />
                    </ChartWrapper>
                  </EuiFlexItem>
                </EuiFlexGrid>
              )}
            />
          );
        }}
      />
    </React.Fragment>
  );
};
