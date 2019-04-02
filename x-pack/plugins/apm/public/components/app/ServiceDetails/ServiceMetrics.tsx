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
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { useServiceMetricCharts } from '../../../hooks/useServiceMetricCharts';
import { useTransactionOverviewCharts } from '../../../hooks/useTransactionOverviewCharts';
import { loadErrorDistribution } from '../../../services/rest/apm/error_groups';
import { CPUUsageChart } from './CPUUsageChart';
import { MemoryUsageChart } from './MemoryUsageChart';

interface ServiceMetricsProps {
  urlParams: IUrlParams;
  location: Location;
}

export function ServiceMetrics({ urlParams, location }: ServiceMetricsProps) {
  const { serviceName, start, end, errorGroupId, kuery } = urlParams;
  const { data: errorDistributionData } = useFetcher(
    () =>
      loadErrorDistribution({ serviceName, start, end, errorGroupId, kuery }),
    [serviceName, start, end, errorGroupId, kuery]
  );

  const { data: transactionOverviewChartsData } = useTransactionOverviewCharts(
    urlParams
  );

  const { data: serviceMetricChartData } = useServiceMetricCharts(urlParams);

  if (!errorDistributionData) {
    return null;
  }

  return (
    <React.Fragment>
      <TransactionCharts
        charts={transactionOverviewChartsData}
        urlParams={urlParams}
        location={location}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel>
            <ErrorDistribution
              distribution={errorDistributionData}
              title={i18n.translate(
                'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                {
                  defaultMessage: 'Error occurrences'
                }
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <SyncChartGroup
        render={hoverXHandlers => (
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiPanel>
                <CPUUsageChart
                  data={serviceMetricChartData.cpu}
                  hoverXHandlers={hoverXHandlers}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <MemoryUsageChart
                  data={serviceMetricChartData.memory}
                  hoverXHandlers={hoverXHandlers}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>
        )}
      />

      <EuiSpacer size="xxl" />
    </React.Fragment>
  );
}
