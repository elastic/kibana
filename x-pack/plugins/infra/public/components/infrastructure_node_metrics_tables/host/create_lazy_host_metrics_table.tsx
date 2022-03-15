/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { CoreProvidersProps } from '../../../apps/common_providers';
import type { SourceProviderProps, UseNodeMetricsTableOptions } from '../shared';

const LazyIntegratedHostMetricsTable = lazy(() => import('./integrated_host_metrics_table'));

export function createLazyHostMetricsTable(coreProvidersProps: CoreProvidersProps) {
  return ({
    timerange,
    filterClauseDsl,
    sourceId,
  }: UseNodeMetricsTableOptions & Partial<SourceProviderProps>) => (
    <Suspense fallback={null}>
      <LazyIntegratedHostMetricsTable
        {...coreProvidersProps}
        sourceId={sourceId || 'default'}
        timerange={timerange}
        filterClauseDsl={filterClauseDsl}
      />
    </Suspense>
  );
}
