/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';

import { EuiErrorBoundary } from '@elastic/eui';

const ExplainLogRateSpikesLazy = React.lazy(() => import('./components/explain_log_rate_spikes'));
const SingleEndpointStreamingDemoLazy = React.lazy(
  () => import('./components/single_endpoint_streaming_demo')
);

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<div>LOADING</div>}>{children}</Suspense>
  </EuiErrorBoundary>
);

export const ExplainLogRateSpikes: FC = () => (
  <LazyWrapper>
    <ExplainLogRateSpikesLazy />
  </LazyWrapper>
);

export const SingleEndpointStreamingDemo: FC = () => (
  <LazyWrapper>
    <SingleEndpointStreamingDemoLazy />
  </LazyWrapper>
);
