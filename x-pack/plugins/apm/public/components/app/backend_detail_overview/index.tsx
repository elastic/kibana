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
import { ApmBackendContextProvider } from '../../../context/apm_backend/apm_backend_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { SearchBar } from '../../shared/search_bar';
import { BackendLatencyChart } from './backend_latency_chart';
import { BackendInventoryTitle } from '../../routing/home';

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
    <ApmMainTemplate pageTitle={backendName}>
      <ApmBackendContextProvider>
        <SearchBar showTimeComparison />
        <ChartPointerEventContextProvider>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <BackendLatencyChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </ChartPointerEventContextProvider>
      </ApmBackendContextProvider>
    </ApmMainTemplate>
  );
}
