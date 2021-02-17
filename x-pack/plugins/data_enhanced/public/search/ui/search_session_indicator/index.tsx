/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDelayRender, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import type {
  SearchSessionIndicatorProps,
  SearchSessionIndicatorRef,
} from './search_session_indicator';
export type { SearchSessionIndicatorProps, SearchSessionIndicatorRef };

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingSpinner />
  </EuiDelayRender>
);

const LazySearchSessionIndicator = React.lazy(() => import('./search_session_indicator'));
export const SearchSessionIndicator = React.forwardRef<
  SearchSessionIndicatorRef,
  SearchSessionIndicatorProps
>((props: SearchSessionIndicatorProps, ref) => (
  <React.Suspense fallback={<Fallback />}>
    <LazySearchSessionIndicator {...props} ref={ref} />
  </React.Suspense>
));
