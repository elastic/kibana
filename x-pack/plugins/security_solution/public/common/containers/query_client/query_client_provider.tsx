/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

export type ReactQueryClientProviderProps = PropsWithChildren<{
  queryClient?: QueryClient;
}>;

export const ReactQueryClientProvider = memo<ReactQueryClientProviderProps>(
  ({ queryClient, children }) => {
    const client = useMemo(() => {
      return queryClient || new QueryClient();
    }, [queryClient]);
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
);

ReactQueryClientProvider.displayName = 'ReactQueryClientProvider';
