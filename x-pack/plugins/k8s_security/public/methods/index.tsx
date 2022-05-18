/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { K8sSecurityDeps } from '../types';

// Initializing react-query
const queryClient = new QueryClient();

const K8sSecurityLazy = lazy(() => import('../components/k8s_security_routes'));

export const getK8sSecurityLazy = (props: K8sSecurityDeps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <K8sSecurityLazy {...props} />
      </Suspense>
    </QueryClientProvider>
  );
};
