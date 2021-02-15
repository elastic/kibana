/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import type { BackgroundSessionIndicatorProps } from './background_session_indicator';
export type { BackgroundSessionIndicatorProps };

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingSpinner />
  </EuiDelayRender>
);

const LazyBackgroundSessionIndicator = React.lazy(() => import('./background_session_indicator'));
export const BackgroundSessionIndicator = (props: BackgroundSessionIndicatorProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyBackgroundSessionIndicator {...props} />
  </React.Suspense>
);
