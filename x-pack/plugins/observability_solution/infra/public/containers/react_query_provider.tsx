/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientConfig, QueryClientProvider } from '@tanstack/react-query';
import merge from 'lodash/merge';
import { EuiButtonIcon } from '@elastic/eui';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const DEFAULT_CONFIG = {
  defaultOptions: {
    queries: { keepPreviousData: true, refetchOnWindowFocus: false },
  },
};

interface ProviderProps {
  children: React.ReactNode;
  config?: QueryClientConfig;
}

export function ReactQueryProvider({ children, config = {} }: ProviderProps) {
  const [queryClient] = useState(() => new QueryClient(merge(DEFAULT_CONFIG, config)));

  return (
    <QueryClientProvider client={queryClient}>
      <HideableReactQueryDevTools />
      {children}
    </QueryClientProvider>
  );
}

function HideableReactQueryDevTools() {
  const [isHidden, setIsHidden] = useState(false);

  return !isHidden ? (
    <div>
      <EuiButtonIcon
        data-test-subj="infraHideableReactQueryDevToolsButton"
        iconType="cross"
        color="primary"
        style={{ zIndex: 99999, position: 'fixed', bottom: '40px', left: '40px' }}
        onClick={() => setIsHidden(!isHidden)}
        aria-label="Disable React Query Dev Tools"
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </div>
  ) : null;
}
