/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Suspense } from 'react';
import { EuiDelayRender, EuiErrorBoundary, EuiLoadingContent } from '@elastic/eui';

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingContent lines={3} />
  </EuiDelayRender>
);

interface Props<T> {
  getLazyComponent: () => FC<T>;
  lazyComponentProps: T;
}

export function LazyWrapper<T>({ getLazyComponent, lazyComponentProps }: Props<T>) {
  const LazyComponent = getLazyComponent();
  return (
    <EuiErrorBoundary>
      <Suspense fallback={<Fallback />}>
        <LazyComponent {...lazyComponentProps} />
      </Suspense>
    </EuiErrorBoundary>
  );
}
