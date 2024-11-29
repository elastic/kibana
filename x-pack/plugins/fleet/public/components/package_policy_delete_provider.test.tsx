/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, waitFor } from '@testing-library/react';

import { EuiContextMenuItem } from '@elastic/eui';

import type { AgentPolicy, PackagePolicy } from '../types';
import { createIntegrationsTestRendererMock } from '../mock';

import { sendGetAgents, useMultipleAgentPolicies } from '../hooks';

import { PackagePolicyDeleteProvider } from './package_policy_delete_provider';

jest.mock('../hooks', () => {
  return {
    ...jest.requireActual('../hooks'),
    useMultipleAgentPolicies: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: { addSuccess: jest.fn() },
      },
    }),
    sendGetAgents: jest.fn(),
    useConfig: jest.fn().mockReturnValue({
      agents: { enabled: true },
    }),
  };
});

const useMultipleAgentPoliciesMock = useMultipleAgentPolicies as jest.MockedFunction<
  typeof useMultipleAgentPolicies
>;
const sendGetAgentsMock = sendGetAgents as jest.MockedFunction<typeof sendGetAgents>;

function renderMenu({
  agentPolicies,
  packagePolicyIds,
}: {
  agentPolicies: AgentPolicy[];
  packagePolicyIds: string[];
}) {
  const renderer = createIntegrationsTestRendererMock();

  const utils = renderer.render(
    <PackagePolicyDeleteProvider agentPolicies={agentPolicies}>
      {(deletePackagePoliciesPrompt) => {
        return (
          <EuiContextMenuItem
            onClick={() => {
              deletePackagePoliciesPrompt(packagePolicyIds, () => {});
            }}
          >
            Delete integration
          </EuiContextMenuItem>
        );
      }}
    </PackagePolicyDeleteProvider>
  );

  return { utils };
}

function createMockAgentPolicies(
  props: Partial<AgentPolicy> = {},
  multiple?: boolean
): AgentPolicy[] {
  if (!multiple) {
    return [
      {
        id: 'some-uuid1',
        namespace: 'default',
        monitoring_enabled: [],
        name: 'Test Policy',
        description: '',
        is_preconfigured: false,
        status: 'active',
        is_managed: false,
        revision: 1,
        updated_at: '',
        updated_by: 'elastic',
        package_policies: [
          { name: 'integration-0001' } as PackagePolicy,
          { name: 'integration-0002' } as PackagePolicy,
        ],
        is_protected: false,
        ...props,
      },
    ];
  } else {
    return [
      {
        id: 'some-uuid1',
        namespace: 'default',
        monitoring_enabled: [],
        name: 'Test Policy 1',
        description: '',
        is_preconfigured: false,
        status: 'active',
        is_managed: false,
        revision: 1,
        updated_at: '',
        updated_by: 'elastic',
        package_policies: [],
        is_protected: false,
        ...props,
      },
      {
        id: 'some-uuid2',
        namespace: 'default',
        monitoring_enabled: [],
        name: 'Test Policy 2',
        description: '',
        is_preconfigured: false,
        status: 'active',
        is_managed: false,
        revision: 1,
        updated_at: '',
        updated_by: 'elastic',
        package_policies: [
          { name: 'integration-0001' } as PackagePolicy,
          { name: 'integration-0002' } as PackagePolicy,
        ],
        is_protected: false,
        ...props,
      },
    ];
  }
}

describe('PackagePolicyDeleteProvider', () => {
  it('Should show delete integrations action and cancel modal', async () => {
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
    sendGetAgentsMock.mockResolvedValue({
      data: {
        statusSummary: {},
        items: [
          {
            id: 'agent123',
            policy_id: 'agent-policy-1',
          },
        ],
        total: 5,
      },
    } as any);
    const agentPolicies = createMockAgentPolicies();
    const { utils } = renderMenu({
      agentPolicies,
      packagePolicyIds: ['integration-0001'],
    });
    const button = utils.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(utils.getByText('This action will affect 5 agents.')).toBeInTheDocument();
      expect(
        utils.getByText('This action can not be undone. Are you sure you wish to continue?')
      ).toBeInTheDocument();
      expect(utils.getAllByText(/is already in use by some of your agents./).length).toBe(1);
    });
  });

  it('When multiple agent policies are present and agents are enrolled show additional warnings', async () => {
    sendGetAgentsMock.mockResolvedValue({
      data: {
        statusSummary: {},
        items: [
          {
            id: 'agent123',
            policy_id: 'agent-policy-1',
          },
        ],
        total: 5,
      },
    } as any);
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: true });
    const agentPolicies = createMockAgentPolicies(undefined, true);
    const { utils } = renderMenu({
      agentPolicies,
      packagePolicyIds: ['integration-0001'],
    });
    const button = utils.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(utils.getByText('This action will affect 5 agents.')).toBeInTheDocument();
      expect(
        utils.getByText('This integration is shared by multiple agent policies.')
      ).toBeInTheDocument();
      expect(
        utils.getByText('This action can not be undone. Are you sure you wish to continue?')
      ).toBeInTheDocument();
      expect(utils.queryAllByText(/is already in use by some of your agents./).length).toBe(0);
    });
  });

  it('When multiple agent policies are present and no agents are enrolled show additional warnings', async () => {
    sendGetAgentsMock.mockResolvedValue({
      data: {
        statusSummary: {},
        items: [],
        total: 0,
      },
    } as any);
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: true });
    const agentPolicies = createMockAgentPolicies(undefined, true);
    const { utils } = renderMenu({
      agentPolicies,
      packagePolicyIds: ['integration-0001'],
    });
    const button = utils.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(utils.queryByText('This action will affect 5 agents.')).not.toBeInTheDocument();
      expect(utils.queryAllByText(/is already in use by some of your agents./).length).toBe(0);
      expect(
        utils.getByText('This integration is shared by multiple agent policies.')
      ).toBeInTheDocument();
      expect(
        utils.getByText('This action can not be undone. Are you sure you wish to continue?')
      ).toBeInTheDocument();
    });
  });

  it('When agentless should show a different set of warnings', async () => {
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
    sendGetAgentsMock.mockResolvedValue({
      data: {
        statusSummary: {},
        items: [
          {
            id: 'agent123',
            policy_id: 'agent-policy-1',
          },
        ],
        total: 5,
      },
    } as any);
    const agentPolicies = createMockAgentPolicies({ supports_agentless: true });
    const { utils } = renderMenu({
      agentPolicies,
      packagePolicyIds: ['integration-0001'],
    });
    const button = utils.getByRole('button');
    fireEvent.click(button);
    // utils.debug();

    await waitFor(() => {
      expect(utils.queryByText('This action will affect 5 agents.')).not.toBeInTheDocument();
      expect(utils.getByText(/about to delete an integration/)).toBeInTheDocument();
      expect(
        utils.getByText('This action can not be undone. Are you sure you wish to continue?')
      ).toBeInTheDocument();
      expect(utils.getAllByText(/integration will stop data ingestion./).length).toBe(1);
    });
  });
});
