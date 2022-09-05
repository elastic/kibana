/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useDependencyDetailOperationsBreadcrumb } from '../../../hooks/use_dependency_detail_operations_breadcrumb';
import { DependencyMetricCharts } from '../../shared/dependency_metric_charts';
import { DetailViewHeader } from '../../shared/detail_view_header';
import { DependencyOperationDistributionChart } from './dependendecy_operation_distribution_chart';
import { DependencyOperationDetailTraceList } from './dependency_operation_detail_trace_list';

export function DependencyOperationDetailView() {
  const router = useApmRouter();

  const {
    query: { spanName, ...query },
  } = useApmParams('/dependencies/operation');

  useDependencyDetailOperationsBreadcrumb();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <DetailViewHeader
          backLabel={i18n.translate(
            'xpack.apm.dependecyOperationDetailView.header.backLinkLabel',
            { defaultMessage: 'All operations' }
          )}
          backHref={router.link('/dependencies/operations', { query })}
          title={spanName}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <ChartPointerEventContextProvider>
          <DependencyMetricCharts />
        </ChartPointerEventContextProvider>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <DependencyOperationDistributionChart />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <DependencyOperationDetailTraceList />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
