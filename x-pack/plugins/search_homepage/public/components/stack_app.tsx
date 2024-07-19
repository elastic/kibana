/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { UsageTrackerContextProvider } from '../contexts/usage_tracker_context';
import { useKibana } from '../hooks/use_kibana';
import { initQueryClient } from '../utils/query_client';
import { HomepageView } from './homepage_view';

export const App: React.FC = () => {
  const {
    services: { notifications, usageCollection },
  } = useKibana();
  const queryClient = initQueryClient(notifications.toasts);
  return (
    <UsageTrackerContextProvider usageCollection={usageCollection}>
      <QueryClientProvider client={queryClient}>
        <HomepageView showEndpointsAPIKeys={false} />
      </QueryClientProvider>
    </UsageTrackerContextProvider>
  );
};
