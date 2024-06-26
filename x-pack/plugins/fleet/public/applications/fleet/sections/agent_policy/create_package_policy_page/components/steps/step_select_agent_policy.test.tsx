/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import type { PackageInfo } from '../../../../../../../../common';

import { ExperimentalFeaturesService } from '../../../../../../../services';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import { useGetAgentPolicies } from '../../../../../hooks';

import { StepSelectAgentPolicy } from './step_select_agent_policy';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useGetAgentPolicies: jest.fn(),
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
    sendBulkGetAgentPolicies: jest.fn().mockImplementation((ids) =>
      Promise.resolve({
        data: { items: ids.map((id: string) => ({ id, package_policies: [] })) },
      })
    ),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetFleetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
    useGetPackagePolicies: jest.fn().mockImplementation((query) => ({
      data: {
        items: query.kuery.includes('osquery_manager')
          ? [{ policy_ids: ['policy-1'] }]
          : query.kuery.includes('apm')
          ? [{ policy_ids: ['policy-2'] }]
          : [],
      },
      error: undefined,
      isLoading: false,
      resendRequest: jest.fn(),
    })),
  };
});

const useGetAgentPoliciesMock = useGetAgentPolicies as jest.MockedFunction<
  typeof useGetAgentPolicies
>;

describe('step select agent policy', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const mockSetHasAgentPolicyError = jest.fn();
  const updateAgentPoliciesMock = jest.fn();
  const render = (packageInfo?: PackageInfo, selectedAgentPolicyIds: string[] = []) =>
    (renderResult = testRenderer.render(
      <StepSelectAgentPolicy
        packageInfo={packageInfo || ({ name: 'apache' } as any)}
        agentPolicies={[]}
        updateAgentPolicies={updateAgentPoliciesMock}
        setHasAgentPolicyError={mockSetHasAgentPolicyError}
        selectedAgentPolicyIds={selectedAgentPolicyIds}
      />
    ));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    updateAgentPoliciesMock.mockReset();
  });

  test('should not select agent policy by default if multiple exists', async () => {
    useGetAgentPoliciesMock.mockReturnValue({
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
    await act(async () => {}); // Needed as updateAgentPolicies is called after multiple useEffect
    await act(async () => {
      expect(updateAgentPoliciesMock).toBeCalled();
      expect(updateAgentPoliciesMock).toBeCalledWith([{ id: 'policy-1', package_policies: [] }]);
    });
  });

  describe('multiple agent policies', () => {
    beforeEach(() => {
      jest
        .spyOn(ExperimentalFeaturesService, 'get')
        .mockReturnValue({ enableReusableIntegrationPolicies: true });

      useGetAgentPoliciesMock.mockReturnValue({
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
    });

    test('should select agent policy by default if one exists', async () => {
      useGetAgentPoliciesMock.mockReturnValueOnce({
        data: { items: [{ id: 'policy-1', name: 'Policy 1' }] },
        error: undefined,
        isLoading: false,
        resendRequest: jest.fn(),
      } as any);

      render();
      await act(async () => {}); // Needed as updateAgentPolicies is called after multiple useEffect
      await act(async () => {
        expect(updateAgentPoliciesMock).toBeCalledWith([{ id: 'policy-1', package_policies: [] }]);
      });
    });

    test('should not select agent policy by default if multiple exists', async () => {
      useGetAgentPoliciesMock.mockReturnValue({
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
        const select = renderResult.container.querySelector(
          '[data-test-subj="agentPolicyMultiSelect"]'
        );
        expect((select as any)?.value).toEqual(undefined);

        expect(renderResult.getByText('An agent policy is required.')).toBeVisible();
      });
    });

    test('should select agent policy if pre selected', async () => {
      render(undefined, ['policy-1']);
      await act(async () => {}); // Needed as updateAgentPolicies is called after multiple useEffect
      await act(async () => {
        expect(updateAgentPoliciesMock).toBeCalledWith([{ id: 'policy-1', package_policies: [] }]);
      });
    });

    test('should select multiple agent policies', async () => {
      const result = render();
      expect(result.getByTestId('agentPolicyMultiSelect')).toBeInTheDocument();
      await act(async () => {
        result.getByTestId('comboBoxToggleListButton').click();
      });
      expect(result.getAllByTestId('agentPolicyMultiItem').length).toBe(2);
      await act(async () => {
        result.getByText('Policy 1').click();
      });
      await act(async () => {
        result.getByText('Policy 2').click();
      });
      expect(updateAgentPoliciesMock).toBeCalledWith([
        { id: 'policy-1', package_policies: [] },
        { id: 'policy-2', package_policies: [] },
      ]);
    });

    test('should disable option if agent policy has limited package', async () => {
      useGetAgentPoliciesMock.mockReturnValue({
        data: {
          items: [
            { id: 'policy-1', name: 'Policy 1' },
            { id: 'policy-2', name: 'Policy 2' },
            { id: 'policy-3', name: 'Policy 3' },
          ],
        },
        error: undefined,
        isLoading: false,
        resendRequest: jest.fn(),
      } as any);
      const result = render({
        name: 'osquery_manager',
        policy_templates: [{ multiple: false }],
      } as any);
      expect(result.getByTestId('agentPolicyMultiSelect')).toBeInTheDocument();
      await act(async () => {
        result.getByTestId('comboBoxToggleListButton').click();
      });
      expect(
        result.getByText('Policy 1').closest('[data-test-subj="agentPolicyMultiItem"]')
      ).toBeDisabled();
    });

    test('should disable option if agent policy has apm package and logstash output', async () => {
      useGetAgentPoliciesMock.mockReturnValue({
        data: {
          items: [
            { id: 'policy-1', name: 'Policy 1' },
            { id: 'policy-2', name: 'Policy 2', data_output_id: 'logstash-1' },
            { id: 'policy-3', name: 'Policy 3' },
          ],
        },
        error: undefined,
        isLoading: false,
        resendRequest: jest.fn(),
      } as any);
      const result = render({
        name: 'apm',
      } as any);
      expect(result.getByTestId('agentPolicyMultiSelect')).toBeInTheDocument();
      await act(async () => {
        result.getByTestId('comboBoxToggleListButton').click();
      });
      expect(
        result.getByText('Policy 2').closest('[data-test-subj="agentPolicyMultiItem"]')
      ).toBeDisabled();
      expect(
        result.getByTitle('Policy 2').querySelector('[data-euiicon-type="warningFilled"]')
      ).toBeInTheDocument();
    });
  });
});
