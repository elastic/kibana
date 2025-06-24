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
import { DependenciesDetailTable } from './dependencies_detail_table';
import { DependencyMetricCharts } from '../../shared/dependency_metric_charts';

export function DependencyDetailOverview() {
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
  } = useApmParams('/dependencies/overview');

  const apmRouter = useApmRouter();

  useBreadcrumb(
    () => [
      {
        title: i18n.translate('xpack.apm.dependencyDetailOverview.breadcrumbTitle', {
          defaultMessage: 'Overview',
        }),
        href: apmRouter.link('/dependencies/overview', {
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
    ],
    [
      apmRouter,
      comparisonEnabled,
      dependencyName,
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
    ]
  );

  return (
    <>
      <ChartPointerEventContextProvider>
        <DependencyMetricCharts />
      </ChartPointerEventContextProvider>
      <EuiSpacer size="l" />
      <DependenciesDetailTable />
    </>
  );
}
