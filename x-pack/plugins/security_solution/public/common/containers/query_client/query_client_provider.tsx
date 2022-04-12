/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

export const queryClient = new QueryClient();

export const ReactQueryClientProvider = memo(({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
});

ReactQueryClientProvider.displayName = 'ReactQueryClientProvider';
