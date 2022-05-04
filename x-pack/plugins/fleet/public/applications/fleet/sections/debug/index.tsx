/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiListGroup,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
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

          <EuiAccordion
            id="agentPolicyDebugger"
            buttonContent="Agent Policy Debugger"
            initialIsOpen={true}
            paddingSize="l"
          >
            <AgentPolicyDebugger />
          </EuiAccordion>
          <EuiSpacer />
          <EuiAccordion
            id="integrationDebugger"
            buttonContent="Integration Debugger"
            initialIsOpen={true}
            paddingSize="l"
          >
            <IntegrationDebugger />
          </EuiAccordion>
          <EuiSpacer />
          <EuiAccordion
            id="savedObjectsDebugger"
            buttonContent="Saved Objects"
            initialIsOpen={true}
            paddingSize="l"
          >
            <SavedObjectsDebugger />
          </EuiAccordion>
          <EuiSpacer />
          <EuiAccordion
            id="fleetIndicesDebugger"
            buttonContent="Fleet Indices"
            initialIsOpen={true}
            paddingSize="l"
          >
            <FleetIndicesDebugger />
          </EuiAccordion>

          <EuiHorizontalRule />

          <EuiTitle size="l">
            <h2>Useful Links</h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiListGroup
            listItems={[
              {
                label: 'Download Health Check Report',
                href: '/api/fleet/health_check',
                target: '_blank',
                download: 'fleet_health_check_report.txt',
              },
              {
                label: 'View Agents in Fleet UI',
                href: '/app/fleet/agents',
                target: '_blank',
              },
              {
                label: 'Troubleshooting Guide',
                href: 'https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html',
                target: '_blank',
              },
            ]}
          />
        </EuiPageBody>
      </EuiPage>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
