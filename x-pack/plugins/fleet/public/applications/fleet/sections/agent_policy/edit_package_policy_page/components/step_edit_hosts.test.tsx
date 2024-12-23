/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { userEvent } from '@testing-library/user-event';

import type { TestRenderer } from '../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { useGetAgentPolicies } from '../../../../hooks';
import type { AgentPolicy, PackageInfo } from '../../../../types';

import { useAllNonManagedAgentPolicies } from '../../create_package_policy_page/components/steps/components/use_policies';

import { StepEditHosts } from './step_edit_hosts';

jest.mock('../../create_package_policy_page/components/steps/components/use_policies', () => {
  return {
    ...jest.requireActual(
      '../../create_package_policy_page/components/steps/components/use_policies'
    ),
    useAllNonManagedAgentPolicies: jest.fn(),
  };
});

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useGetAgentPolicies: jest.fn(),
    useGetOutputs: jest.fn().mockResolvedValue({
      data: [],
      isLoading: false,
    }),
    sendGetOneAgentPolicy: jest.fn().mockImplementation((id) =>
      Promise.resolve({
        data: { item: { id, name: `Agent policy ${id}` } },
      })
    ),
  };
});

describe('StepEditHosts', () => {
  const packageInfo: PackageInfo = {
    name: 'apache',
    version: '1.0.0',
    description: '',
    format_version: '',
    release: 'ga',
    owner: { github: '' },
    title: 'Apache',
    latestVersion: '',
    assets: {} as any,
    status: 'not_installed',
    vars: [],
  };
  const agentPolicies: AgentPolicy[] = [
    {
      id: '1',
      namespace: 'default',
      name: 'Agent policy 1',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
    {
      id: '2',
      namespace: 'default',
      name: 'Agent policy 2',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
  ];
  const newAgentPolicy = {
    name: '',
    namespace: 'default',
  };
  const validation = {};

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <StepEditHosts
        agentPolicies={agentPolicies}
        updateAgentPolicies={jest.fn()}
        newAgentPolicy={newAgentPolicy}
        updateNewAgentPolicy={jest.fn()}
        withSysMonitoring={false}
        updateSysMonitoring={jest.fn()}
        validation={validation}
        packageInfo={packageInfo}
        setHasAgentPolicyError={jest.fn()}
        updateSelectedTab={jest.fn()}
        selectedAgentPolicyIds={[]}
      />
    ));
  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('should display create form when no agent policies', async () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [],
      },
    });

    (useAllNonManagedAgentPolicies as jest.MockedFunction<any>).mockReturnValue([]);

    render();

    expect(renderResult.queryByRole('tablist')).not.toBeInTheDocument();
    expect(renderResult.getByText('For existing hosts:')).toBeInTheDocument();
    expect(renderResult.getByText('For a new host:')).toBeInTheDocument();
  });

  it('should display new policy button and existing policies when agent policies exist', () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [{ id: '1', name: 'Agent policy 1', namespace: 'default' }],
      },
    });
    (useAllNonManagedAgentPolicies as jest.MockedFunction<any>).mockReturnValue([
      { id: '1', name: 'Agent policy 1', namespace: 'default' },
    ]);

    render();

    expect(renderResult.getByTestId('createNewAgentPolicyButton')).toBeInTheDocument();
    expect(
      renderResult.container.querySelector('[data-test-subj="agentPolicySelect"]')?.textContent
    ).toContain('Agent policy 1');
  });

  it('should display dropdown without preselected value when multiple agent policies', async () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [
          { id: '1', name: 'Agent policy 1', namespace: 'default' },
          { id: '2', name: 'Agent policy 2', namespace: 'default' },
        ],
      },
    });

    render();

    expect(
      renderResult.getByText('Select an agent policy to add this integration to')
    ).toBeInTheDocument();
  });

  it('should display delete button when add button clicked', async () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [{ id: '1', name: 'Agent policy 1', namespace: 'default' }],
      },
    });
    (useAllNonManagedAgentPolicies as jest.MockedFunction<any>).mockReturnValue([
      { id: '1', name: 'Agent policy 1', namespace: 'default' },
    ]);

    render();

    await userEvent.click(
      renderResult.getByTestId('createNewAgentPolicyButton').closest('button')!
    );

    await waitFor(() => {
      expect(renderResult.getByTestId('deleteNewAgentPolicyButton')).toBeInTheDocument();
    });
  });
});
