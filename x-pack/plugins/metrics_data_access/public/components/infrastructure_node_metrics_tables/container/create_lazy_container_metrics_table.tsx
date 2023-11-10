/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React, { lazy, Suspense } from 'react';
import { MetricsDataClient } from '../../../lib/metrics_client';
import type { NodeMetricsTableProps } from '../shared';

const LazyIntegratedContainerMetricsTable = lazy(
  () => import('./integrated_container_metrics_table')
);

export function createLazyContainerMetricsTable(core: CoreStart, metricsClient: MetricsDataClient) {
  return ({ timerange, filterClauseDsl, sourceId }: NodeMetricsTableProps) => {
    return (
      <Suspense fallback={null}>
        <LazyIntegratedContainerMetricsTable
          core={core}
          metricsClient={metricsClient}
          theme$={core.theme.theme$}
          sourceId={sourceId || 'default'}
          timerange={timerange}
          filterClauseDsl={filterClauseDsl}
        />
      </Suspense>
    );
  };
}
