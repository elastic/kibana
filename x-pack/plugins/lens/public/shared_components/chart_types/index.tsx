/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { XYChartTypesProps } from './xy_chart_types';

const ChartTypesComponent = lazy(() => import('./xy_chart_types'));

export const XYChartTypes = (props: XYChartTypesProps) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChartTypesComponent {...props} />
    </Suspense>
  );
};
