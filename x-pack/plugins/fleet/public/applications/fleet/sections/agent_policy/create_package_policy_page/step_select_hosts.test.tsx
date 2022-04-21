/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import type { TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';

import { useGetAgentPolicies } from '../../../hooks';
import type { AgentPolicy, PackageInfo } from '../../../types';

import { StepSelectHosts } from './step_select_hosts';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useGetAgentPolicies: jest.fn(),
    useGetOutputs: jest.fn().mockResolvedValue({
      data: [],
      isLoading: false,
    }),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'policy-1', name: 'Agent policy 1' } },
    }),
  };
});

describe('StepSelectHosts', () => {
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
  const agentPolicy: AgentPolicy = {
    id: 'agent-policy-1',
    namespace: 'default',
    name: 'Agent policy 1',
    is_managed: false,
    status: 'active',
    updated_at: '',
    updated_by: '',
    revision: 1,
    package_policies: [],
  };
  const newAgentPolicy = {
    name: '',
    namespace: 'default',
  };
  const validation = {};

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () =>
    (renderResult = testRenderer.render(
      <StepSelectHosts
        agentPolicy={agentPolicy}
        updateAgentPolicy={jest.fn()}
        newAgentPolicy={newAgentPolicy}
        updateNewAgentPolicy={jest.fn()}
        withSysMonitoring={false}
        updateSysMonitoring={jest.fn()}
        validation={validation}
        packageInfo={packageInfo}
        setHasAgentPolicyError={jest.fn()}
        updateSelectedTab={jest.fn()}
        selectedAgentPolicyId={undefined}
      />
    ));
  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  it('should display create form when no agent policies', () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [],
      },
    });

    render();

    waitFor(() => {
      expect(renderResult.getByText('Agent policy 1')).toBeInTheDocument();
    });
    expect(renderResult.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('should display tabs with New hosts selected when agent policies exist', () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [{ id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' }],
      },
    });

    render();

    waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
      expect(renderResult.getByText('Agent policy 2')).toBeInTheDocument();
    });
    expect(renderResult.getByText('New hosts').closest('button')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('should display dropdown with agent policy selected when Existing hosts selected', async () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [{ id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' }],
      },
    });

    render();

    waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
    });
    act(() => {
      fireEvent.click(renderResult.getByText('Existing hosts').closest('button')!);
    });

    expect(
      renderResult.container.querySelector('[data-test-subj="agentPolicySelect"]')?.textContent
    ).toEqual('Agent policy 1');
  });

  it('should display dropdown without preselected value when Existing hosts selected with mulitple agent policies', () => {
    (useGetAgentPolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [
          { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
          { id: 'agent-policy-2', name: 'Agent policy 2', namespace: 'default' },
        ],
      },
    });

    render();

    waitFor(() => {
      expect(renderResult.getByRole('tablist')).toBeInTheDocument();
    });
    act(() => {
      fireEvent.click(renderResult.getByText('Existing hosts').closest('button')!);
    });

    waitFor(() => {
      expect(renderResult.getByText('An agent policy is required.')).toBeInTheDocument();
    });
  });
});
