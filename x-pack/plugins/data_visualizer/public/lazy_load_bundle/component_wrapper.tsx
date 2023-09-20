/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';
import { EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import type { DataComparisonDetectionAppStateProps } from '../application/data_comparison/data_comparison_app_state';

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiSkeletonText lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

const FileDataVisualizerComponent = React.lazy(
  () => import('../application/file_data_visualizer/file_data_visualizer')
);

export const FileDataVisualizerWrapper: FC = () => {
  return (
    <React.Suspense fallback={<div />}>
      <FileDataVisualizerComponent />
    </React.Suspense>
  );
};

const DataComparisonLazy = React.lazy(() => import('../application/data_comparison'));

/**
 * Lazy-wrapped ExplainLogRateSpikesAppState React component
 * @param {ExplainLogRateSpikesAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const DataComparison: FC<DataComparisonDetectionAppStateProps> = (props) => (
  <LazyWrapper>
    <DataComparisonLazy {...props} />
  </LazyWrapper>
);
