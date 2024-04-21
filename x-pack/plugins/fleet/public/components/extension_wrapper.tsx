/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, Suspense } from 'react';
import { EuiErrorBoundary } from '@elastic/eui';

import { Loading } from './loading';

export const ExtensionWrapper = memo<{ children: ReactNode }>(
  ({ children }: { children?: React.ReactNode }) => {
    return (
      <EuiErrorBoundary>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </EuiErrorBoundary>
    );
  }
);
