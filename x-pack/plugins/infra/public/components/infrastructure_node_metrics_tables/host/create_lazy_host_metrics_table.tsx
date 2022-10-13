/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { InfraClientStartServices } from '../../../types';
import type { SourceProviderProps, UseNodeMetricsTableOptions } from '../shared';

const LazyIntegratedHostMetricsTable = lazy(() => import('./integrated_host_metrics_table'));

export function createLazyHostMetricsTable(getStartServices: () => InfraClientStartServices) {
  return ({
    timerange,
    filterClauseDsl,
    sourceId,
  }: UseNodeMetricsTableOptions & Partial<SourceProviderProps>) => {
    const [core, plugins, pluginStart] = getStartServices();

    return (
      <Suspense fallback={null}>
        <LazyIntegratedHostMetricsTable
          core={core}
          plugins={plugins}
          pluginStart={pluginStart}
          theme$={core.theme.theme$}
          sourceId={sourceId || 'default'}
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
        />
      </Suspense>
    );
  };
}
