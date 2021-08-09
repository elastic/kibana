/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApmBackendContextProvider } from '../../../context/apm_backend/apm_backend_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { SearchBar } from '../../shared/search_bar';
import { BackendLatencyChart } from './backend_latency_chart';
import { BackendInventoryTitle } from '../../routing/home';
import { BackendDetailDependenciesTable } from './backend_detail_dependencies_table';
import { BackendThroughputChart } from './backend_throughput_chart';
import { BackendErrorRateChart } from './backend_error_rate_chart';
import { BackendDetailTemplate } from '../../routing/templates/backend_detail_template';

export function BackendDetailOverview() {
  const {
    path: { backendName },
    query,
  } = useApmParams('/backends/:backendName/overview');

  const apmRouter = useApmRouter();

  useBreadcrumb([
    {
      title: BackendInventoryTitle,
      href: apmRouter.link('/backends'),
    },
    {
      title: backendName,
      href: apmRouter.link('/backends/:backendName/overview', {
        path: { backendName },
        query,
      }),
    },
  ]);

  return (
    <ApmBackendContextProvider>
      <BackendDetailTemplate title={backendName}>
        <SearchBar showTimeComparison />
        <ChartPointerEventContextProvider>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.backendDetailLatencyChartTitle',
                      { defaultMessage: 'Latency' }
                    )}
                  </h2>
                </EuiTitle>
                <BackendLatencyChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.backendDetailThroughputChartTitle',
                      { defaultMessage: 'Throughput' }
                    )}
                  </h2>
                </EuiTitle>
                <BackendThroughputChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.backendDetailErrorRateChartTitle',
                      { defaultMessage: 'Error rate' }
                    )}
                  </h2>
                </EuiTitle>
                <BackendErrorRateChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </ChartPointerEventContextProvider>
        <EuiSpacer size="m" />
        <BackendDetailDependenciesTable />
      </BackendDetailTemplate>
    </ApmBackendContextProvider>
  );
}
