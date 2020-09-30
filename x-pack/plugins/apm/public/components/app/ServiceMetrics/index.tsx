/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useServiceMetricCharts } from '../../../hooks/useServiceMetricCharts';
import { MetricsChart } from '../../shared/charts/MetricsChart';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';
import { Projection } from '../../../../common/projections';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

interface ServiceMetricsProps {
  agentName: string;
  serviceName: string;
}

export function ServiceMetrics({
  agentName,
  serviceName,
}: ServiceMetricsProps) {
  const { urlParams } = useUrlParams();
  const { data } = useServiceMetricCharts(urlParams, agentName);
  const { start, end } = urlParams;

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
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
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <ChartsSyncContextProvider>
            <EuiFlexGrid columns={2} gutterSize="s">
              {data.charts.map((chart) => (
                <EuiFlexItem key={chart.key}>
                  <EuiPanel>
                    <MetricsChart start={start} end={end} chart={chart} />
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiSpacer size="xxl" />
          </ChartsSyncContextProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
