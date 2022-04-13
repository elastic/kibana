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
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { SearchBar } from '../../shared/search_bar';
import { BackendLatencyChart } from './backend_latency_chart';
import { DependenciesInventoryTitle } from '../../routing/home';
import { BackendDetailDependenciesTable } from './backend_detail_dependencies_table';
import { BackendThroughputChart } from './backend_throughput_chart';
import { BackendFailedTransactionRateChart } from './backend_error_rate_chart';
import { BackendDetailTemplate } from '../../routing/templates/backend_detail_template';
import {
  getKueryBarBoolFilter,
  kueryBarPlaceholder,
} from '../../../../common/backends';
import { useBreakpoints } from '../../../hooks/use_breakpoints';

export function BackendDetailOverview() {
  const {
    query: {
      backendName,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      environment,
      kuery,
      comparisonEnabled,
    },
  } = useApmParams('/backends/overview');

  const apmRouter = useApmRouter();

  useBreadcrumb([
    {
      title: DependenciesInventoryTitle,
      href: apmRouter.link('/backends', {
        query: {
          rangeFrom,
          rangeTo,
          refreshInterval,
          refreshPaused,
          environment,
          kuery,
          comparisonEnabled,
        },
      }),
    },
    {
      title: backendName,
      href: apmRouter.link('/backends/overview', {
        query: {
          backendName,
          rangeFrom,
          rangeTo,
          refreshInterval,
          refreshPaused,
          environment,
          kuery,
          comparisonEnabled,
        },
      }),
    },
  ]);

  const kueryBarBoolFilter = getKueryBarBoolFilter({
    environment,
    backendName,
  });

  const largeScreenOrSmaller = useBreakpoints().isLarge;

  return (
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
                  {i18n.translate('xpack.apm.backendDetailLatencyChartTitle', {
                    defaultMessage: 'Latency',
                  })}
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
  );
}
