/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { createFleetTestRendererMock } from '../../mock';

import { AppRoutes } from './app';
import { useAuthz } from './hooks';

jest.mock('./sections/agents', () => ({
  AgentsApp: () => <p>AgentsApp</p>,
}));
jest.mock('./sections/agent_policy', () => ({
  AgentPolicyApp: () => <p>AgentPolicyApp</p>,
}));
jest.mock('./sections/settings', () => ({
  SettingsApp: () => <p>SettingsApp</p>,
}));
jest.mock('./hooks', () => ({
  ...jest.requireActual('./hooks'),
  useAuthz: jest.fn(),
}));

describe('AppRoutes', () => {
  describe('Privileges', () => {
    const SCENARIOS = [
      {
        description: 'with Fleet:Agents:Read it should render AgentsApp',
        path: '/agents',
        authz: {
          fleet: {
            readAgents: true,
          },
          integrations: {},
        },
      },
      {
        description: 'without Fleet:Agents:Read it should not render AgentsApp',
        path: '/agents',
        expectMissingPrivileges:
          'You are not authorized to access that page. It requires the Agents Read Kibana privilege for Fleet.',
        authz: {
          fleet: {},
          integrations: {},
        },
      },
      {
        description: 'with Fleet:AgentPolicies:Read it should render AgentPolicyApp',
        path: '/policies',
        expectApp: 'AgentPolicyApp',
        authz: {
          fleet: {
            readAgentPolicies: true,
          },
          integrations: {},
        },
      },
      {
        description: 'without Fleet:AgentPolicies:Read it should not render AgentPolicyApp',
        path: '/policies',
        expectMissingPrivileges:
          'You are not authorized to access that page. It requires the Agent policies Read Kibana privilege for Fleet.',
        authz: {
          fleet: {},
          integrations: {},
        },
      },
      {
        description: 'with Fleet:Settings:Read it should render SettingsApp',
        path: '/settings',
        expectApp: 'SettingsApp',
        authz: {
          fleet: {
            readSettings: true,
          },
          integrations: {},
        },
      },
      {
        description: 'without Fleet:Settings:Read it should not render SettingsApp',
        path: '/settings',
        expectMissingPrivileges:
          'You are not authorized to access that page. It requires the Settings Read Kibana privilege for Fleet.',
        authz: {
          fleet: {},
          integrations: {},
        },
      },
    ];
    for (const scenario of SCENARIOS) {
      it(scenario.description, () => {
        jest.mocked(useAuthz).mockReturnValue(scenario.authz as any);
        const testRenderer = createFleetTestRendererMock();
        testRenderer.startServices.navigation.ui.TopNavMenu = () => null as any;
        testRenderer.history.push(`/mock${scenario.path}`);
        const result = testRenderer.render(<AppRoutes setHeaderActionMenu={() => {}} />, {});
        if (scenario.expectMissingPrivileges) {
          const promptMessage = result.queryByTestId('missingPrivilegesPromptMessage');
          expect(promptMessage).not.toBeNull();
          expect(promptMessage?.textContent).toBe(scenario.expectMissingPrivileges);
        }
        if (scenario.expectApp) {
          expect(result.queryByText(scenario.expectApp)).not.toBeNull();
        }
      });
    }
  });
});
