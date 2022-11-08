/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IndicatorsPage } from '../modules/indicators/pages';
import { IntegrationsGuard } from './integrations_guard/integrations_guard';
import { SecuritySolutionPluginTemplateWrapper } from './security_solution_plugin_template_wrapper';

export const IndicatorsPageWrapper: VFC = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <IntegrationsGuard>
        <SecuritySolutionPluginTemplateWrapper>
          <IndicatorsPage />
        </SecuritySolutionPluginTemplateWrapper>
      </IntegrationsGuard>
    </QueryClientProvider>
  );
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default IndicatorsPageWrapper;
