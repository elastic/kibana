/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

type QueryClientOptionsProp = ConstructorParameters<typeof QueryClient>[0];

/**
 * A security solution specific react-query query client that sets defaults
 */
export class SecuritySolutionQueryClient extends QueryClient {
  constructor(options: QueryClientOptionsProp = {}) {
    const optionsWithDefaults: QueryClientOptionsProp = {
      ...options,
      defaultOptions: {
        ...(options.defaultOptions ?? {}),
        queries: {
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          keepPreviousData: true,
          ...(options?.defaultOptions?.queries ?? {}),
        },
      },
    };
    super(optionsWithDefaults);
  }
}

export type ReactQueryClientProviderProps = PropsWithChildren<{
  queryClient?: SecuritySolutionQueryClient;
}>;

export const ReactQueryClientProvider = memo<ReactQueryClientProviderProps>(
  ({ queryClient, children }) => {
    const client = useMemo(() => {
      return queryClient || new SecuritySolutionQueryClient();
    }, [queryClient]);
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
);

ReactQueryClientProvider.displayName = 'ReactQueryClientProvider';
