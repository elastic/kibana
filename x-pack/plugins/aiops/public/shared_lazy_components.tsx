/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';

import { EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import type { ExplainLogRateSpikesAppStateProps } from './components/explain_log_rate_spikes';
import type { LogCategorizationAppStateProps } from './components/log_categorization';
import type { ChangePointDetectionAppStateProps } from './components/change_point_detection';

const ExplainLogRateSpikesAppStateLazy = React.lazy(
  () => import('./components/explain_log_rate_spikes')
);

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiSkeletonText lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

/**
 * Lazy-wrapped ExplainLogRateSpikesAppState React component
 * @param {ExplainLogRateSpikesAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesAppStateProps> = (props) => (
  <LazyWrapper>
    <ExplainLogRateSpikesAppStateLazy {...props} />
  </LazyWrapper>
);

const LogCategorizationAppStateLazy = React.lazy(() => import('./components/log_categorization'));

/**
 * Lazy-wrapped LogCategorizationAppStateProps React component
 * @param {LogCategorizationAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const LogCategorization: FC<LogCategorizationAppStateProps> = (props) => (
  <LazyWrapper>
    <LogCategorizationAppStateLazy {...props} />
  </LazyWrapper>
);

const ChangePointDetectionLazy = React.lazy(() => import('./components/change_point_detection'));
/**
 * Lazy-wrapped ChangePointDetectionAppStateProps React component
 * @param {ChangePointDetectionAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const ChangePointDetection: FC<ChangePointDetectionAppStateProps> = (props) => (
  <LazyWrapper>
    <ChangePointDetectionLazy {...props} />
  </LazyWrapper>
);
