/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SearchNotebooks } from './search_notebooks';

export interface SearchNotebooksViewProps {
  core: CoreStart;
  queryClient: QueryClient;
}

export const SearchNotebooksView = ({ core, queryClient }: SearchNotebooksViewProps) => (
  <KibanaThemeProvider theme={core.theme}>
    <KibanaContextProvider services={{ ...core }}>
      <QueryClientProvider client={queryClient}>
        <SearchNotebooks />
      </QueryClientProvider>
    </KibanaContextProvider>
  </KibanaThemeProvider>
);
