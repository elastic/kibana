/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import type { IntegratedNodeMetricsTableProps, UseNodeMetricsTableOptions } from '../shared';
import { HostMetricsTable } from './host_metrics_table';
import { useHostMetricsTable } from './use_host_metrics_table';

function HookedHostMetricsTable({
  timerange,
  filterClauseDsl,
  metricsClient,
}: UseNodeMetricsTableOptions) {
  const hostMetricsTableProps = useHostMetricsTable({ timerange, filterClauseDsl, metricsClient });
  return <HostMetricsTable {...hostMetricsTableProps} />;
}

function HostMetricsTableWithProviders({
  timerange,
  filterClauseDsl,
  sourceId,
  metricsClient,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedHostMetricsTable
        timerange={timerange}
        filterClauseDsl={filterClauseDsl}
        metricsClient={metricsClient}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default HostMetricsTableWithProviders;
