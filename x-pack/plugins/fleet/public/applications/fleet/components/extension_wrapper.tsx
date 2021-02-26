/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { memo, ReactNode, Suspense } from 'react';
import { Loading } from './loading';

export const ExtensionWrapper = memo<{ children: ReactNode }>(({ children }) => {
  return (
    <EuiErrorBoundary>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </EuiErrorBoundary>
  );
});
