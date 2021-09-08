/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  getKueryBarBoolFilter,
  kueryBarPlaceholder,
} from '../../../../common/backends';
import { ApmBackendContextProvider } from '../../../context/apm_backend/apm_backend_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useBreakPoints } from '../../../hooks/use_break_points';
import { DependenciesInventoryTitle } from '../../routing/home';
import { BackendDetailTemplate } from '../../routing/templates/backend_detail_template';
import { SearchBar } from '../../shared/search_bar';
import { BackendDetailDependenciesTable } from './backend_detail_dependencies_table';
import { BackendFailedTransactionRateChart } from './backend_error_rate_chart';
import { BackendLatencyChart } from './backend_latency_chart';
import { BackendThroughputChart } from './backend_throughput_chart';

export function BackendDetailOverview() {
  const {
    path: { backendName },
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/backends/:backendName/overview');

  const apmRouter = useApmRouter();

  useBreadcrumb([
    {
      title: DependenciesInventoryTitle,
      href: apmRouter.link('/backends', {
        query: { rangeFrom, rangeTo, environment, kuery },
      }),
    },
    {
      title: backendName,
      href: apmRouter.link('/backends/:backendName/overview', {
        path: { backendName },
        query: {
          rangeFrom,
          rangeTo,
          environment,
          kuery,
        },
      }),
    },
  ]);

  const kueryBarBoolFilter = getKueryBarBoolFilter({
    environment,
    backendName,
  });

  const largeScreenOrSmaller = useBreakPoints().isLarge;

  return (
    <ApmBackendContextProvider>
      <BackendDetailTemplate title={backendName}>
        <SearchBar
          showTimeComparison
          kueryBarPlaceholder={kueryBarPlaceholder}
          kueryBarBoolFilter={kueryBarBoolFilter}
        />
        <ChartPointerEventContextProvider>
          <EuiFlexGroup
            direction={largeScreenOrSmaller ? 'column' : 'row'}
            gutterSize="s"
          >
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
                      'xpack.apm.backendDetailFailedTransactionRateChartTitle',
                      { defaultMessage: 'Failed transaction rate' }
                    )}
                  </h2>
                </EuiTitle>
                <BackendFailedTransactionRateChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </ChartPointerEventContextProvider>
        <EuiSpacer size="l" />
        <BackendDetailDependenciesTable />
      </BackendDetailTemplate>
    </ApmBackendContextProvider>
  );
}
