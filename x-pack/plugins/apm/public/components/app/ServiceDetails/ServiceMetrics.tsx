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
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import { ErrorDistribution } from 'x-pack/plugins/apm/public/components/app/ErrorGroupDetails/Distribution';
import { SyncChartGroup } from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { TransactionCharts } from 'x-pack/plugins/apm/public/components/shared/charts/TransactionCharts';
import { ErrorDistributionRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/errorDistribution';
import { MetricsChartDataRequest } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceMetricsCharts';
import { TransactionOverviewChartsRequestForAllTypes } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { CPUUsageChart } from './CPUUsageChart';
import { MemoryUsageChart } from './MemoryUsageChart';

interface ServiceMetricsProps {
  urlParams: IUrlParams;
  location: Location;
}

export function ServiceMetrics({ urlParams, location }: ServiceMetricsProps) {
  return (
    <React.Fragment>
      <TransactionOverviewChartsRequestForAllTypes
        urlParams={urlParams}
        render={({ data }) => (
          <TransactionCharts
            charts={data}
            urlParams={urlParams}
            location={location}
          />
        )}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <ErrorDistributionRequest
              urlParams={urlParams}
              render={({ data }) => (
                <ErrorDistribution
                  distribution={data}
                  title={i18n.translate(
                    'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                    {
                      defaultMessage: 'Error occurrences'
                    }
                  )}
                />
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <MetricsChartDataRequest
        urlParams={urlParams}
        render={({ data }) => {
          return (
            <SyncChartGroup
              render={hoverXHandlers => (
                <EuiFlexGrid columns={2}>
                  <EuiFlexItem>
                    <EuiPanel>
                      <CPUUsageChart
                        data={data.cpu}
                        hoverXHandlers={hoverXHandlers}
                      />
                    </EuiPanel>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiPanel>
                      <MemoryUsageChart
                        data={data.memory}
                        hoverXHandlers={hoverXHandlers}
                      />
                    </EuiPanel>
                  </EuiFlexItem>
                </EuiFlexGrid>
              )}
            />
          );
        }}
      />

      <EuiSpacer size="xxl" />
    </React.Fragment>
  );
}
