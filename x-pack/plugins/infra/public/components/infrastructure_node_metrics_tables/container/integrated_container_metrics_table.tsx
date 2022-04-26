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
import { ContainerMetricsTable } from './container_metrics_table';
import { useContainerMetricsTable } from './use_container_metrics_table';

function HookedContainerMetricsTable({ timerange, filterClauseDsl }: UseNodeMetricsTableOptions) {
  const containerMetricsTableProps = useContainerMetricsTable({ timerange, filterClauseDsl });
  return <ContainerMetricsTable {...containerMetricsTableProps} />;
}

function ContainerMetricsTableWithProviders({
  timerange,
  filterClauseDsl,
  sourceId,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <SourceProvider sourceId={sourceId}>
        <HookedContainerMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />
      </SourceProvider>
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default ContainerMetricsTableWithProviders;
