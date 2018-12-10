/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import React from 'react';
// @ts-ignore
import Distribution from 'x-pack/plugins/apm/public/components/app/ErrorGroupDetails/Distribution';
import { TransactionCharts } from 'x-pack/plugins/apm/public/components/shared/charts/TransactionCharts';
// @ts-ignore
import { ErrorDistributionRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/errorDistribution';
import { MetricsChartDataRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceMetricsCharts';
import { TransactionOverviewChartsRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { CPUUsageChart } from './CPUUsageChart';
import { MemoryUsageChart } from './MemoryUsageChart';

interface ServiceMetricsProps {
  serviceName: string;
  urlParams: IUrlParams;
}

export const ServiceMetrics: React.SFC<ServiceMetricsProps> = props => {
  const { serviceName, urlParams } = props;
  // TODO: Find out why serviceName isn't present in urlParams here?
  const params = { serviceName, ...urlParams };
  return (
    <React.Fragment>
      <TransactionOverviewChartsRequest
        urlParams={params}
        render={({ data }) => (
          <TransactionCharts
            charts={data}
            urlParams={params}
            location={location}
          />
        )}
      />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <ErrorDistributionRequest
              urlParams={params}
              render={({ data }: { data: any }) => (
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
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <MetricsChartDataRequest
        urlParams={params}
        render={({ data }) => {
          // console.log('metrics request data??', data);
          // return null;
          return (
            <EuiFlexGrid columns={2}>
              <EuiFlexItem>
                <EuiPanel>
                  <CPUUsageChart data={data.cpu} />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel>
                  <MemoryUsageChart data={data.memory} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGrid>
          );
        }}
      />
    </React.Fragment>
  );
};
