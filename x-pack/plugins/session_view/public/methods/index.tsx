/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionViewDeps } from '../types';

// Initializing react-query
const queryClient = new QueryClient();

const SessionViewLazy = lazy(() => import('../components/session_view'));

export const getSessionViewLazy = (props: SessionViewDeps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <SessionViewLazy {...props} />
      </Suspense>
    </QueryClientProvider>
  );
};
