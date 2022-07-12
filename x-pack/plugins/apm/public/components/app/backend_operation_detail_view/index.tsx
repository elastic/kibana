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
import { useBackendDetailOperationsBreadcrumb } from '../../../hooks/use_backend_detail_operations_breadcrumb';
import { BackendMetricCharts } from '../../shared/backend_metric_charts';
import { DetailViewHeader } from '../../shared/detail_view_header';
import { BackendOperationDistributionChart } from './backend_operation_distribution_chart';
import { BackendOperationDetailTraceList } from './backend_operation_detail_trace_list';

export function BackendOperationDetailView() {
  const router = useApmRouter();

  const {
    query: { spanName, ...query },
  } = useApmParams('/backends/operation');

  useBackendDetailOperationsBreadcrumb();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <DetailViewHeader
          backLabel={i18n.translate(
            'xpack.apm.backendOperationDetailView.header.backLinkLabel',
            { defaultMessage: 'All operations' }
          )}
          backHref={router.link('/backends/operations', { query })}
          title={spanName}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <ChartPointerEventContextProvider>
          <BackendMetricCharts />
        </ChartPointerEventContextProvider>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <BackendOperationDistributionChart />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <BackendOperationDetailTraceList />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
