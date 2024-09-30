/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import type { TestRenderer } from '../mock';
import { createFleetTestRendererMock } from '../mock';
import type { AgentPolicy } from '../types';

import { usePackagePolicyWithRelatedData } from '../applications/fleet/sections/agent_policy/edit_package_policy_page/hooks';

import { useGetAgentPolicies } from '../hooks';

import { ManageAgentPoliciesModal } from './manage_agent_policies_modal';

jest.mock('../applications/fleet/sections/agent_policy/edit_package_policy_page/hooks', () => ({
  ...jest.requireActual(
    '../applications/fleet/sections/agent_policy/edit_package_policy_page/hooks'
  ),
  usePackagePolicyWithRelatedData: jest.fn().mockReturnValue({
    packageInfo: {},
    packagePolicy: { name: 'Integration 1' },
    savePackagePolicy: jest.fn().mockResolvedValue({ error: undefined }),
  }),
}));

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [] as AgentPolicy[],
    },
    isLoading: false,
  }),
  useGetPackagePolicies: jest.fn().mockReturnValue({
    data: {
      items: [{ name: 'Integration 1', revision: 2, id: 'integration1', policy_ids: ['policy1'] }],
    },
    isLoading: false,
  }),
  useGetOutputs: jest.fn().mockReturnValue({
    data: {
      items: [
        {
          id: 'logstash-1',
          type: 'logstash',
        },
      ],
    },
    isLoading: false,
  }),
}));

describe('ManageAgentPoliciesModal', () => {
  let testRenderer: TestRenderer;
  const mockOnClose = jest.fn();
  const mockPolicies = [{ name: 'Test policy', revision: 2, id: 'policy1' }] as AgentPolicy[];

  const render = (policies?: AgentPolicy[]) =>
    testRenderer.render(
      <ManageAgentPoliciesModal
        selectedAgentPolicies={policies || mockPolicies}
        packagePolicyId="integration1"
        onClose={mockOnClose}
        onAgentPoliciesChange={jest.fn()}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();

    (useGetAgentPolicies as jest.Mock).mockReturnValue({
      data: {
        items: [
          { name: 'Test policy', revision: 2, id: 'policy1' },
          { name: 'Test policy 2', revision: 1, id: 'policy2' },
        ] as AgentPolicy[],
      },
      isLoading: false,
    });
  });

  it('should update policy on submit', async () => {
    const results = render();

    expect(results.queryByTestId('manageAgentPoliciesModal')).toBeInTheDocument();
    expect(results.getByTestId('integrationNameText').textContent).toEqual(
      'Integration: Integration 1'
    );

    await act(async () => {
      results.getByTestId('comboBoxToggleListButton').click();
    });
    await act(async () => {
      results.getByText('Test policy 2').click();
    });
    expect(results.getByText('Confirm').getAttribute('disabled')).toBeNull();
    await act(async () => {
      results.getByText('Confirm').click();
    });
    expect(usePackagePolicyWithRelatedData('', {}).savePackagePolicy).toHaveBeenCalledWith({
      policy_ids: ['policy1', 'policy2'],
    });
  });

  it('should keep managed policy when policies are changed', async () => {
    (useGetAgentPolicies as jest.Mock).mockReturnValue({
      data: {
        items: [
          { name: 'Test policy', revision: 2, id: 'policy1', is_managed: true },
          { name: 'Test policy 2', revision: 1, id: 'policy2' },
        ] as AgentPolicy[],
      },
      isLoading: false,
    });
    const results = render([
      { name: 'Test policy', revision: 2, id: 'policy1', is_managed: true },
    ] as AgentPolicy[]);

    expect(results.queryByTestId('manageAgentPoliciesModal')).toBeInTheDocument();
    expect(results.getByTestId('integrationNameText').textContent).toEqual(
      'Integration: Integration 1'
    );

    await act(async () => {
      results.getByTestId('comboBoxToggleListButton').click();
    });
    expect(results.queryByText('Test policy')).toBeNull();
    await act(async () => {
      results.getByText('Test policy 2').click();
    });
    expect(results.getByText('Confirm').getAttribute('disabled')).toBeNull();
    await act(async () => {
      results.getByText('Confirm').click();
    });
    expect(usePackagePolicyWithRelatedData('', {}).savePackagePolicy).toHaveBeenCalledWith({
      policy_ids: ['policy1', 'policy2'],
    });
  });

  it('should display callout and allow to submit if all policies are removed', async () => {
    const results = render();

    await act(async () => {
      results.getByTestId('comboBoxClearButton').click();
    });
    expect(results.getByText('Confirm').getAttribute('disabled')).toBeNull();
    expect(results.getByTestId('confirmRemovePoliciesCallout')).toBeInTheDocument();
    expect(results.getByTestId('confirmRemovePoliciesCallout').textContent).toContain(
      'Test policy will no longer use this integration.'
    );

    await act(async () => {
      results.getByText('Confirm').click();
    });
    expect(usePackagePolicyWithRelatedData('', {}).savePackagePolicy).toHaveBeenCalledWith({
      policy_id: undefined,
      policy_ids: [],
    });
  });
});
