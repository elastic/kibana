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

import { useMultipleAgentPolicies, useLink } from '../hooks';

import { PackagePolicyActionsMenu } from './package_policy_actions_menu';

jest.mock('../hooks', () => {
  return {
    ...jest.requireActual('../hooks'),
    useMultipleAgentPolicies: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      application: {
        navigateToApp: jest.fn(),
      },
      notifications: {
        toasts: { addSuccess: jest.fn() },
      },
    }),
    useLink: jest.fn().mockReturnValue({
      getHref: jest
        .fn()
        .mockReturnValue('/mock/app/fleet/policies/some-uuid1/edit-integration/some-uuid2'),
    }),
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
// FLAKY: https://github.com/elastic/kibana/issues/191804
describe.skip('PackagePolicyActionsMenu', () => {
  beforeAll(() => {
    useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
  });

  it('Should not have upgrade button if package does not have upgrade', async () => {
    const agentPolicies = createMockAgentPolicies();
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: false });
    const { utils } = renderMenu({ agentPolicies, packagePolicy });
    await act(async () => {
      expect(utils.queryByTestId('PackagePolicyActionsUpgradeItem')).toBeNull();
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

  it('Should not enable upgrade button if package has upgrade and agentless policy is enabled', async () => {
    const agentPolicies = createMockAgentPolicies({ supports_agentless: true });
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
    const { utils } = renderMenu({ agentPolicies, packagePolicy });

    await act(async () => {
      const upgradeButton = utils.getByTestId('PackagePolicyActionsUpgradeItem');
      expect(upgradeButton).toBeDisabled();
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

  it('Should be able to delete integration from a managed agentless policy', async () => {
    const agentPolicies = createMockAgentPolicies({ is_managed: false, supports_agentless: true });
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

  it('Should not show add button if the policy is agentless and showAddAgent=true', async () => {
    const agentPolicies = createMockAgentPolicies({ supports_agentless: true });
    const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
    const { utils } = renderMenu({ agentPolicies, packagePolicy, showAddAgent: true });
    await act(async () => {
      expect(utils.queryByText('Add agent')).toBeNull();
    });
  });

  it('Should show Edit integration with correct href when agentPolicy is defined', async () => {
    const agentPolicies = createMockAgentPolicies();
    const packagePolicy = createMockPackagePolicy();
    const { utils } = renderMenu({ agentPolicies, packagePolicy });
    await act(async () => {
      const editButton = utils.getByTestId('PackagePolicyActionsEditItem');
      expect(editButton).not.toHaveAttribute('disabled');
      expect(editButton).toHaveAttribute('href');
      expect(useLink().getHref as jest.Mock).toHaveBeenCalledWith('edit_integration', {
        policyId: 'some-uuid1',
        packagePolicyId: 'some-uuid2',
      });
      expect(editButton).toHaveAttribute(
        'href',
        '/mock/app/fleet/policies/some-uuid1/edit-integration/some-uuid2'
      );
    });
  });

  it('Should show Edit integration with correct href when there is no agent policy', async () => {
    const packagePolicy = createMockPackagePolicy({
      policy_ids: [],
    });
    const { utils } = renderMenu({
      agentPolicies: [],
      packagePolicy,
    });
    await act(async () => {
      const editButton = utils.getByTestId('PackagePolicyActionsEditItem');
      expect(editButton).not.toHaveAttribute('disabled');
      expect(editButton).toHaveAttribute('href');
      expect(useLink().getHref as jest.Mock).toHaveBeenCalledWith('integration_policy_edit', {
        packagePolicyId: 'some-uuid2',
      });
    });
  });
});
