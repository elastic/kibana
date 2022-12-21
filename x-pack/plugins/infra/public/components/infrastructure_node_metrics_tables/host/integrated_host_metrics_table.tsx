/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import { SourceProvider } from '../../../containers/metrics_source';
import type { IntegratedNodeMetricsTableProps, UseNodeMetricsTableOptions } from '../shared';
import { HostMetricsTable } from './host_metrics_table';
import { useHostMetricsTable } from './use_host_metrics_table';

function HookedHostMetricsTable({ timerange, filterClauseDsl }: UseNodeMetricsTableOptions) {
  const hostMetricsTableProps = useHostMetricsTable({ timerange, filterClauseDsl });
  return <HostMetricsTable {...hostMetricsTableProps} />;
}

function HostMetricsTableWithProviders({
  timerange,
  filterClauseDsl,
  sourceId,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <SourceProvider sourceId={sourceId}>
        <HookedHostMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />
      </SourceProvider>
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default HostMetricsTableWithProviders;
