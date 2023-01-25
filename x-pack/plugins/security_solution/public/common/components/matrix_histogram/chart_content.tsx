/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BarChartComponentProps } from '../charts/barchart';
import { BarChart } from '../charts/barchart';
import { MatrixLoader } from './matrix_loader';

const MatrixHistogramChartContentComponent = ({
  isInitialLoading,
  barChart,
  configs,
  stackByField,
  scopeId,
}: BarChartComponentProps & { isInitialLoading: boolean }) => {
  return isInitialLoading ? (
    <MatrixLoader />
  ) : (
    <BarChart barChart={barChart} configs={configs} stackByField={stackByField} scopeId={scopeId} />
  );
};

export const MatrixHistogramChartContent = React.memo(MatrixHistogramChartContentComponent);

MatrixHistogramChartContentComponent.displayName = 'MatrixHistogramChartContentComponent';
