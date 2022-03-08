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

import { PackagePolicyActionsMenu } from './package_policy_actions_menu';

function renderMenu({
  agentPolicy,
  packagePolicy,
  showAddAgent = false,
  defaultIsOpen = true,
}: {
  agentPolicy: AgentPolicy;
  packagePolicy: InMemoryPackagePolicy;
  showAddAgent?: boolean;
  defaultIsOpen?: boolean;
}) {
  const renderer = createIntegrationsTestRendererMock();

  const utils = renderer.render(
    <PackagePolicyActionsMenu
      agentPolicy={agentPolicy}
      packagePolicy={packagePolicy}
      showAddAgent={showAddAgent}
      upgradePackagePolicyHref=""
      defaultIsOpen={defaultIsOpen}
      key="test1"
    />
  );

  return { utils };
}

function createMockAgentPolicy(props: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
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
    ...props,
  };
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
    enabled: true,
    output_id: '',
    namespace: 'default',
    inputs: [],
    revision: 1,
    hasUpgrade: false,
    ...props,
  };
}

test('Should disable upgrade button if package does not have upgrade', async () => {
  const agentPolicy = createMockAgentPolicy();
  const packagePolicy = createMockPackagePolicy({ hasUpgrade: false });
  const { utils } = renderMenu({ agentPolicy, packagePolicy });
  await act(async () => {
    const upgradeButton = utils.getByText('Upgrade integration policy').closest('button');
    expect(upgradeButton).toBeDisabled();
  });
});

test('Should enable upgrade button if package has upgrade', async () => {
  const agentPolicy = createMockAgentPolicy();
  const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
  const { utils } = renderMenu({ agentPolicy, packagePolicy });
  await act(async () => {
    const upgradeButton = utils.getByText('Upgrade integration policy').closest('button');
    expect(upgradeButton).not.toBeDisabled();
  });
});

test('Should not be able to delete integration from a managed policy', async () => {
  const agentPolicy = createMockAgentPolicy({ is_managed: true });
  const packagePolicy = createMockPackagePolicy();
  const { utils } = renderMenu({ agentPolicy, packagePolicy });
  await act(async () => {
    expect(utils.queryByText('Delete integration')).toBeNull();
  });
});

test('Should be able to delete integration from a non-managed policy', async () => {
  const agentPolicy = createMockAgentPolicy({ is_managed: false });
  const packagePolicy = createMockPackagePolicy();
  const { utils } = renderMenu({ agentPolicy, packagePolicy });
  await act(async () => {
    expect(utils.queryByText('Delete integration')).not.toBeNull();
  });
});

test('Should show add button if the policy is not managed and showAddAgent=true', async () => {
  const agentPolicy = createMockAgentPolicy();
  const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
  const { utils } = renderMenu({ agentPolicy, packagePolicy, showAddAgent: true });
  await act(async () => {
    expect(utils.queryByText('Add agent')).not.toBeNull();
  });
});

test('Should not show add button if the policy is managed and showAddAgent=true', async () => {
  const agentPolicy = createMockAgentPolicy({ is_managed: true });
  const packagePolicy = createMockPackagePolicy({ hasUpgrade: true });
  const { utils } = renderMenu({ agentPolicy, packagePolicy, showAddAgent: true });
  await act(async () => {
    expect(utils.queryByText('Add agent')).toBeNull();
  });
});
