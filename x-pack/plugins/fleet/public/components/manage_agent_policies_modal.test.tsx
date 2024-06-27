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
      items: [
        { name: 'Test policy', revision: 2, id: 'policy1' },
        { name: 'Test policy 2', revision: 1, id: 'policy2' },
      ] as AgentPolicy[],
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
  const policies = [{ name: 'Test policy', revision: 2, id: 'policy1' }] as AgentPolicy[];

  const render = () =>
    testRenderer.render(
      <ManageAgentPoliciesModal
        selectedAgentPolicies={policies}
        packagePolicyId="integration1"
        onClose={mockOnClose}
      />
    );

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
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

  it('should display callout and disable confirm if policy is removed', async () => {
    const results = render();

    await act(async () => {
      results.getByTestId('comboBoxClearButton').click();
    });
    expect(results.getByText('Confirm').getAttribute('disabled')).toBeDefined();
    expect(results.getByTestId('confirmRemovePoliciesCallout')).toBeInTheDocument();
    expect(results.getByTestId('confirmRemovePoliciesCallout').textContent).toContain(
      'Test policy will no longer use this integration.'
    );
  });
});
