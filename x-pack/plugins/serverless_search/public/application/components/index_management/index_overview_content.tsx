/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { IndexContent } from '@kbn/index-management-plugin/public/services';

import { ServerlessSearchPluginStartDependencies } from '../../../types';

import { IndexDetailOverview } from './index_overview';

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
            <IndexDetailOverview index={index.index} />
          </QueryClientProvider>
        </KibanaContextProvider>
      );
    },
  };
};
