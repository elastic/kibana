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
import { PodMetricsTable } from './pod_metrics_table';
import { usePodMetricsTable } from './use_pod_metrics_table';

function HookedPodMetricsTable({ timerange, filterClauseDsl }: UseNodeMetricsTableOptions) {
  const podMetricsTableProps = usePodMetricsTable({ timerange, filterClauseDsl });
  return <PodMetricsTable {...podMetricsTableProps} />;
}

function PodMetricsTableWithProviders({
  timerange,
  filterClauseDsl,
  sourceId,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <SourceProvider sourceId={sourceId}>
        <HookedPodMetricsTable timerange={timerange} filterClauseDsl={filterClauseDsl} />
      </SourceProvider>
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default PodMetricsTableWithProviders;
