/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useServiceMetricChartsFetcher } from '../../../hooks/use_service_metric_charts_fetcher';
import { MetricsChart } from '../../shared/charts/metrics_chart';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { Projection } from '../../../../common/projections';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { SearchBar } from '../../shared/search_bar';

interface ServiceMetricsProps {
  agentName: string;
  serviceName: string;
}

export function ServiceMetrics({
  agentName,
  serviceName,
}: ServiceMetricsProps) {
  const { urlParams } = useUrlParams();
  const { data, status } = useServiceMetricChartsFetcher({
    serviceNodeName: undefined,
  });
  const { start, end } = urlParams;

  const localFiltersConfig: React.ComponentProps<
    typeof LocalUIFilters
  > = useMemo(
    () => ({
      filterNames: ['host', 'containerId', 'podName', 'serviceVersion'],
      params: {
        serviceName,
      },
      projection: Projection.metrics,
      showCount: false,
    }),
    [serviceName]
  );

  return (
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <LocalUIFilters {...localFiltersConfig} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <ChartPointerEventContextProvider>
              <EuiFlexGrid columns={2} gutterSize="s">
                {data.charts.map((chart) => (
                  <EuiFlexItem key={chart.key}>
                    <EuiPanel>
                      <MetricsChart
                        start={start}
                        end={end}
                        chart={chart}
                        fetchStatus={status}
                      />
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
              <EuiSpacer size="xxl" />
            </ChartPointerEventContextProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
