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
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
// @ts-ignore
import Distribution from 'x-pack/plugins/apm/public/components/app/ErrorGroupDetails/Distribution';
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

      <EuiSpacer size="xxl" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <ErrorDistributionRequest
            urlParams={urlParams}
            render={({ data }) => (
              <Distribution
                distribution={data}
                title={
                  <EuiTitle size="s">
                    <span>
                      {i18n.translate(
                        'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                        {
                          defaultMessage: 'Error occurrences'
                        }
                      )}
                    </span>
                  </EuiTitle>
                }
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      <MetricsChartDataRequest
        urlParams={urlParams}
        render={({ data }) => {
          return (
            <SyncChartGroup
              render={hoverXHandlers => (
                <EuiFlexGrid columns={2}>
                  <EuiFlexItem>
                    <CPUUsageChart
                      data={data.cpu}
                      hoverXHandlers={hoverXHandlers}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <MemoryUsageChart
                      data={data.memory}
                      hoverXHandlers={hoverXHandlers}
                    />
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
