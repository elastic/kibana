/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionViewTableProcessTreeProps } from '../types';

// Initializing react-query
const queryClient = new QueryClient();

const SessionViewTableProcessTreeLazy = lazy(
  () => import('../components/session_view_table_process_tree')
);
const SessionViewLazy = lazy(() => import('../components/session_view'));
export const getSessionViewTableProcessTreeLazy = (props: SessionViewTableProcessTreeProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <SessionViewTableProcessTreeLazy {...props} />
    </Suspense>
  );
};
export const getSessionViewLazy = (sessionEntityId: string) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <SessionViewLazy sessionEntityId={sessionEntityId} />
      </Suspense>
    </QueryClientProvider>
  );
};
