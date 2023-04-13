/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EuiLoadingSpinner } from '@elastic/eui';

const queryClient = new QueryClient();

const RulesSettingsLinkLazy: React.FC = lazy(
  () => import('../application/components/rules_setting/rules_settings_link')
);

export const getRulesSettingsLinkLazy = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <RulesSettingsLinkLazy />
      </Suspense>
    </QueryClientProvider>
  );
};
