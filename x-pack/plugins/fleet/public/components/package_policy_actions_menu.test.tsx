/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act } from '@testing-library/react';

import type { AgentPolicy, InMemoryPackagePolicy } from '../types';
import { createIntegrationsTestRendererMock } from '../mock';

import { useMultipleAgentPolicies } from '../hooks';

import { PackagePolicyActionsMenu } from './package_policy_actions_menu';

jest.mock('../hooks', () => {
  return {
    ...jest.requireActual('../hooks'),
    useMultipleAgentPolicies: jest.fn(),
  };
});

const useMultipleAgentPoliciesMock = useMultipleAgentPolicies as jest.MockedFunction<
  typeof useMultipleAgentPolicies
>;

function renderMenu({
  agentPolicies,
  packagePolicy,
  showAddAgent = false,
  defaultIsOpen = true,
}: {
  agentPolicies: AgentPolicy[];
  packagePolicy: InMemoryPackagePolicy;
  showAddAgent?: boolean;
  defaultIsOpen?: boolean;
}) {
  const renderer = createIntegrationsTestRendererMock();

  const utils = renderer.render(
    <PackagePolicyActionsMenu
      agentPolicies={agentPolicies}
      packagePolicy={packagePolicy}
      showAddAgent={showAddAgent}
      upgradePackagePolicyHref="/test/upgrade-link"
      defaultIsOpen={defaultIsOpen}
      key="test1"
    />
  );

  return { utils };
}

function createMockAgentPolicies(props: Partial<AgentPolicy> = {}): AgentPolicy[] {
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
      package_policies: [],
      is_protected: false,
      ...props,
    },
  ];
}

function createMockPackagePolicy(
  props: Partial<InMemoryPackagePolicy> = {}
): InMemoryPackagePolicy {
  return {
    id: 'some-uuid2',
    name: 'mock-package-policy',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
    namespace: 'default',
    inputs: [],
    revision: 1,
    hasUpgrade: false,
    ...props,
  };
}
describe('PackagePolicyActionsMenu', () => {
  beforeAll(() => {
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
  });

  it('Should disable upgrade button if package does not have upgrade', async () => {
    const agentPolicies = createMockAgentPolicies();
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: false });
    const { utils } = renderMenu({ agentPolicies, packagePolicy });
    await act(async () => {
      const upgradeButton = utils.getByText('Upgrade integration policy').closest('button');
      expect(upgradeButton).toBeDisabled();
    });
  });

  it('Should enable upgrade button if package has upgrade', async () => {
    const agentPolicies = createMockAgentPolicies();
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
    const { utils } = renderMenu({ agentPolicies, packagePolicy });

    await act(async () => {
      const upgradeButton = utils.getByTestId('PackagePolicyActionsUpgradeItem');
      expect(upgradeButton).not.toBeDisabled();
    });
  });

  it('Should not be able to delete integration from a managed policy', async () => {
    const agentPolicies = createMockAgentPolicies({ is_managed: true });
    const packagePolicy = createMockPackagePolicy();
    const { utils } = renderMenu({ agentPolicies, packagePolicy });
    await act(async () => {
      expect(utils.queryByText('Delete integration')).toBeNull();
    });
  });

  it('Should be able to delete integration from a non-managed policy', async () => {
    const agentPolicies = createMockAgentPolicies({ is_managed: false });
    const packagePolicy = createMockPackagePolicy();
    const { utils } = renderMenu({ agentPolicies, packagePolicy });
    await act(async () => {
      expect(utils.queryByText('Delete integration')).not.toBeNull();
    });
  });

  it('Should show add button if the policy is not managed and showAddAgent=true', async () => {
    const agentPolicies = createMockAgentPolicies();
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
    const { utils } = renderMenu({ agentPolicies, packagePolicy, showAddAgent: true });
    await act(async () => {
      expect(utils.queryByText('Add agent')).not.toBeNull();
    });
  });

  it('Should not show add button if the policy is managed and showAddAgent=true', async () => {
    const agentPolicies = createMockAgentPolicies({ is_managed: true });
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
    const { utils } = renderMenu({ agentPolicies, packagePolicy, showAddAgent: true });
    await act(async () => {
      expect(utils.queryByText('Add agent')).toBeNull();
    });
  });
});
