/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiHorizontalRule,
  EuiListGroup,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import {
  AgentPolicyDebugger,
  IntegrationDebugger,
  PreconfigurationDebugger,
  FleetIndicesDebugger,
  SavedObjectsDebugger,
} from './components';

// TODO: Evaluate moving this react-query initialization up to the main Fleet app
// setup if we end up pursuing wider adoption of react-query.
export const queryClient = new QueryClient();

const panels = [
  {
    title: 'Agent Policy Debugger',
    id: 'agentPolicyDebugger',
    component: <AgentPolicyDebugger />,
  },
  {
    title: 'Integration Debugger',
    id: 'integrationDebugger',
    component: <IntegrationDebugger />,
  },
  {
    title: 'Saved Objects Debugger',
    id: 'savedObjectsDebugger',
    component: <SavedObjectsDebugger />,
  },
  {
    title: 'Fleet Indices Debugger',
    id: 'fleetIndicesDebugger',
    component: <FleetIndicesDebugger />,
  },
  {
    title: 'Preconfiguration Debugger',
    id: 'preconfigurationDebugger',
    component: <PreconfigurationDebugger />,
  },
];

export const DebugPage: React.FunctionComponent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <EuiPage>
        <EuiPageBody panelled>
          <EuiPageHeader pageTitle="Fleet Debugging Dashboard" iconType="wrench" />
          <EuiCallOut color="danger" iconType="alert" title="Danger zone">
            <EuiText grow={false}>
              <p>
                This page provides an interface for directly managing {"Fleet's"} underlying data
                and diagnosing issues. Be aware that these debugging tools can be{' '}
                <strong>destructive</strong> in nature and can result in{' '}
                <strong>loss of data</strong>. Please proceed with caution.
              </p>
            </EuiText>
          </EuiCallOut>

          <EuiSpacer size="xl" />

          {panels.map(({ title, id, component }) => (
            <>
              <EuiAccordion
                id={id}
                initialIsOpen
                buttonContent={
                  <EuiTitle size="l">
                    <h2>{title}</h2>
                  </EuiTitle>
                }
              >
                <EuiSpacer size="m" />
                {component}
              </EuiAccordion>

              <EuiHorizontalRule />
            </>
          ))}

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
