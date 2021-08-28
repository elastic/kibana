/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiErrorBoundary } from '@elastic/eui';
import type { FC } from 'react';
import React, { Suspense } from 'react';
import { VegaChartLoading } from './vega_chart_loading';
import type { VegaChartViewProps } from './vega_chart_view';

const VegaChartView = React.lazy(() => import('./vega_chart_view'));

export const VegaChart: FC<VegaChartViewProps> = (props) => (
  <EuiErrorBoundary>
    <Suspense fallback={<VegaChartLoading />}>
      <VegaChartView {...props} />
    </Suspense>
  </EuiErrorBoundary>
);
