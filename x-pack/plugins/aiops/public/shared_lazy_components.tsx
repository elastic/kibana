/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';

import { EuiErrorBoundary, EuiLoadingContent } from '@elastic/eui';
import type { ExplainLogRateSpikesAppStateProps } from './components/explain_log_rate_spikes';
import type { LogCategorizationAppStateProps } from './components/log_categorization';

const ExplainLogRateSpikesAppStateLazy = React.lazy(
  () => import('./components/explain_log_rate_spikes')
);

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiLoadingContent lines={3} />}>{children}</Suspense>
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
 * Lazy-wrapped LogCategorizationAppStateProps React component
 * @param {LogCategorizationAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export const ChangePointDetection: FC<LogCategorizationAppStateProps> = (props) => (
  <LazyWrapper>
    <ChangePointDetectionLazy {...props} />
  </LazyWrapper>
);
