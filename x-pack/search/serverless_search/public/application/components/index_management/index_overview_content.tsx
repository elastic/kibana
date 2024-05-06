/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { EuiLoadingSpinner } from '@elastic/eui';

import { IndexContent } from '@kbn/index-management-plugin/public/services';

import { ServerlessSearchPluginStartDependencies } from '../../../types';

const IndexDetailOverview = lazy(() => import('./index_overview'));

export const createIndexOverviewContent = (
  core: CoreStart,
  services: ServerlessSearchPluginStartDependencies
): IndexContent => {
  return {
    renderContent: (index) => {
      const queryClient = new QueryClient();
      return (
        <KibanaContextProvider services={{ ...core, ...services }}>
          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />
            <Suspense fallback={<EuiLoadingSpinner />}>
              <IndexDetailOverview index={index.index} />
            </Suspense>
          </QueryClientProvider>
        </KibanaContextProvider>
      );
    },
  };
};
