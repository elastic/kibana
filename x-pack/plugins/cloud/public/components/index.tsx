/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiErrorBoundary } from '@elastic/eui';

export const LazyChat = React.lazy(() => import('./chat'));
export const Chat = () => (
  <EuiErrorBoundary>
    <Suspense fallback={<div />}>
      <LazyChat />
    </Suspense>
  </EuiErrorBoundary>
);
