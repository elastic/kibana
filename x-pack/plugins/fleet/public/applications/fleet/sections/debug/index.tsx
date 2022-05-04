/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiPage, EuiPageBody, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import {
  AgentPolicyDebugger,
  IntegrationDebugger,
  FleetIndicesDebugger,
  SavedObjectsDebugger,
} from './components';

// TODO: Evaluate moving this react-query initialization up to the main Fleet app
// setup if we end up pursuing wider adoption of react-query.
export const queryClient = new QueryClient();

export const DebugPage: React.FunctionComponent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <EuiPage>
        <EuiPageBody panelled>
          <EuiPageHeader
            pageTitle="Fleet Debugging Dashboard"
            iconType="wrench"
            description={`This page provides an interface for managing Fleet's data and diagnosing issues.
            Be aware that these debugging tools can be destructive in nature, and you should proceed with caution.`}
          />

          <EuiSpacer size="xl" />
          <AgentPolicyDebugger />
          <EuiSpacer size="xl" />

          <EuiHorizontalRule />

          <EuiSpacer size="xl" />
          <IntegrationDebugger />
          <EuiSpacer size="xl" />

          <EuiHorizontalRule />

          <EuiSpacer size="xl" />
          <SavedObjectsDebugger />
          <EuiSpacer size="xl" />

          <EuiHorizontalRule />

          <EuiSpacer size="xl" />
          <FleetIndicesDebugger />
          <EuiSpacer size="xl" />
        </EuiPageBody>
      </EuiPage>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
