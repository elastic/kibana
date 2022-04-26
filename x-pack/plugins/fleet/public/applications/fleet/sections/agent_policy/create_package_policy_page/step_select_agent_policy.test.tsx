/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import type { TestRenderer } from '../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../mock';

import { useGetAgentPolicies } from '../../../hooks';

import { StepSelectAgentPolicy } from './step_select_agent_policy';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useGetAgentPolicies: jest.fn(),
    useGetOutputs: jest.fn().mockResolvedValue({
      data: [],
      isLoading: false,
    }),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'policy-1' } },
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetFleetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
  };
});

const useGetAgentPoliciesMock = useGetAgentPolicies as jest.MockedFunction<
  typeof useGetAgentPolicies
>;

describe('step select agent policy', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const mockSetHasAgentPolicyError = jest.fn();
  const updateAgentPolicyMock = jest.fn();
  const render = () =>
    (renderResult = testRenderer.render(
      <StepSelectAgentPolicy
        packageInfo={{ name: 'apache' } as any}
        agentPolicy={undefined}
        updateAgentPolicy={updateAgentPolicyMock}
        setHasAgentPolicyError={mockSetHasAgentPolicyError}
        selectedAgentPolicyId={undefined}
      />
    ));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    updateAgentPolicyMock.mockReset();
  });

  test('should not select agent policy by default if multiple exists', async () => {
    useGetAgentPoliciesMock.mockReturnValueOnce({
      data: {
        items: [
          { id: 'policy-1', name: 'Policy 1' },
          { id: 'policy-2', name: 'Policy 2' },
        ],
      },
      error: undefined,
      isLoading: false,
      resendRequest: jest.fn(),
    } as any);

    render();

    await act(async () => {
      const select = renderResult.container.querySelector('[data-test-subj="agentPolicySelect"]');
      expect((select as any)?.value).toEqual('');

      expect(renderResult.getByText('An agent policy is required.')).toBeVisible();
    });
  });

  test('should select agent policy by default if one exists', async () => {
    useGetAgentPoliciesMock.mockReturnValueOnce({
      data: { items: [{ id: 'policy-1', name: 'Policy 1' }] },
      error: undefined,
      isLoading: false,
      resendRequest: jest.fn(),
    } as any);

    render();
    await act(async () => {}); // Needed as updateAgentPolicy is called after multiple useEffect
    await act(async () => {
      expect(updateAgentPolicyMock).toBeCalled();
      expect(updateAgentPolicyMock).toBeCalledWith({ id: 'policy-1' });
    });
  });
});
