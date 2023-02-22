/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LazyControlGroupRenderer } from '@kbn/controls-plugin/public';
import { EuiLoadingSpinner, EuiErrorBoundary } from '@elastic/eui';
import React from 'react';

export const LazyControlsRenderer = (
  props: React.ComponentProps<typeof LazyControlGroupRenderer>
) => (
  <EuiErrorBoundary>
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <LazyControlGroupRenderer {...props} />
    </React.Suspense>
  </EuiErrorBoundary>
);
