/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MANAGEMENT_PATH } from '../../common/constants';
import { ManagementContainer } from './pages';
import { SecuritySubPluginRoutes } from '../app/types';
import { CurrentLicense } from '../common/components/current_license';
const queryClient = new QueryClient();

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => (
  <CurrentLicense>
    <QueryClientProvider client={queryClient}>
      <ManagementContainer />
    </QueryClientProvider>
  </CurrentLicense>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGEMENT_PATH,
    render: ManagementRoutes,
  },
];
