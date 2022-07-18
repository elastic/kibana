/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';

import { EuiErrorBoundary, EuiLoadingContent } from '@elastic/eui';

import type { ExplainLogRateSpikesWrapperProps } from './components/explain_log_rate_spikes';

const ExplainLogRateSpikesWrapperLazy = React.lazy(
  () => import('./components/explain_log_rate_spikes')
);

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiLoadingContent lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

/**
 * Lazy-wrapped ExplainLogRateSpikesWrapper React component
 * @param {ExplainLogRateSpikesWrapperProps}  props - properties specifying the data on which to run the analysis.
 */
export const ExplainLogRateSpikes: FC<ExplainLogRateSpikesWrapperProps> = (props) => (
  <LazyWrapper>
    <ExplainLogRateSpikesWrapperLazy {...props} />
  </LazyWrapper>
);
