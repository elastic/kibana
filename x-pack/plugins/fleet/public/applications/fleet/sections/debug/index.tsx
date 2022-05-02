/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// TODO: Evaluate moving this react-query initialization up to the main Fleet app
// setup if we end up pursuing wider adoption of react-query.
const queryClient = new QueryClient();

export const DebugPage: React.FunctionComponent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <main>Debug Page</main>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
