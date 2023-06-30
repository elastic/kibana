/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { LoadWhenInViewProps } from './load_when_in_view';

const LoadWhenInViewLazy = lazy(() => import('./load_when_in_view'));

export function LoadWhenInView(props: LoadWhenInViewProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LoadWhenInViewLazy {...props} />
    </Suspense>
  );
}
