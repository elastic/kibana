/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { BackendDetailDependenciesTable } from './backend_detail_dependencies_table';
import { BackendMetricCharts } from '../../shared/backend_metric_charts';

export function BackendDetailOverview() {
  const {
    query: {
      dependencyName,
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
      title: i18n.translate('xpack.apm.backendDetailOverview.breadcrumbTitle', {
        defaultMessage: 'Overview',
      }),
      href: apmRouter.link('/backends/overview', {
        query: {
          dependencyName,
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

  return (
    <>
      <ChartPointerEventContextProvider>
        <BackendMetricCharts />
      </ChartPointerEventContextProvider>
      <EuiSpacer size="l" />
      <BackendDetailDependenciesTable />
    </>
  );
}
