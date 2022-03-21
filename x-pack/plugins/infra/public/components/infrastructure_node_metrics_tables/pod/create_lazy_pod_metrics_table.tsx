/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { CoreProvidersProps } from '../../../apps/common_providers';
import type { SourceProviderProps, UseNodeMetricsTableOptions } from '../shared';

const LazyIntegratedPodMetricsTable = lazy(() => import('./integrated_pod_metrics_table'));

export function createLazyPodMetricsTable(coreProvidersProps: CoreProvidersProps) {
  return ({
    timerange,
    filterClauseDsl,
    sourceId,
  }: UseNodeMetricsTableOptions & Partial<SourceProviderProps>) => (
    <Suspense fallback={null}>
      <LazyIntegratedPodMetricsTable
        {...coreProvidersProps}
        sourceId={sourceId || 'default'}
        timerange={timerange}
        filterClauseDsl={filterClauseDsl}
      />
    </Suspense>
  );
}
