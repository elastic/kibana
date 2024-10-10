/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';

import { createPackagePolicyMock } from '../../../../../../../../common/mocks';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';

import { SetupTechnology } from '../../../../../../../../common/types';
import { sendGetOneAgentPolicy } from '../../../../../hooks';
import { useAgentless } from '../../../../../../../hooks';
import { SelectedPolicyTab } from '../../components';

import { useSetupTechnology } from './setup_technology';

jest.mock('../../../../../../../services');
jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  sendGetOneAgentPolicy: jest.fn(),
}));
jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  useAgentless: jest.fn(),
}));
jest.mock('../../../../../../../../common/services/generate_new_agent_policy');

type MockFn = jest.MockedFunction<any>;

// TODO: Fix mocks
describe('useSetupTechnology', () => {
  const setNewAgentPolicy = jest.fn();
  const updateAgentPoliciesMock = jest.fn();
  const setSelectedPolicyTabMock = jest.fn();
  const newAgentPolicyMock = {
    name: 'mock_new_agent_policy',
    namespace: 'default',
    is_managed: false,
    supports_agentless: false,
  };
  const packagePolicyMock = createPackagePolicyMock();

  beforeEach(() => {
    (sendGetOneAgentPolicy as MockFn).mockResolvedValue({
      data: {
        item: { id: 'agentless-policy-id' },
      },
    });
    (generateNewAgentPolicyWithDefaults as MockFn).mockReturnValue({
      name: 'Agentless policy for endpoint-1',
      supports_agentless: true,
    });
    jest.clearAllMocks();
  });

  it('should initialize with default values when agentless is disabled', () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: false,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('should fetch agentless policy if agentless feature is enabled and isServerless is true', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: true,
    });

    const { waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    await waitForNextUpdate();

    expect(sendGetOneAgentPolicy).toHaveBeenCalled();
  });

  it('should set agentless setup technology if agent policy supports agentless in edit page', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: true,
      isDefaultAgentlessPolicyEnabled: false,
    });
    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        isEditPage: true,
        agentPolicies: [{ id: 'agentless-policy-id', supports_agentless: true } as any],
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
  });

  it('should create agentless policy if agentless feature is enabled and isCloud is true and agentless.api.url', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: true,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(generateNewAgentPolicyWithDefaults).toHaveBeenCalled();

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });
    waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    expect(setNewAgentPolicy).toHaveBeenCalledWith({
      name: 'Agentless policy for endpoint-1',
      supports_agentless: true,
    });
  });

  it('should update agentless policy name to match integration name if agentless is enabled', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: true,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result, rerender } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(generateNewAgentPolicyWithDefaults).toHaveBeenCalled();

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    expect(setNewAgentPolicy).toHaveBeenCalledWith({
      name: 'Agentless policy for endpoint-1',
      supports_agentless: true,
    });

    rerender({
      setNewAgentPolicy,
      newAgentPolicy: newAgentPolicyMock,
      updateAgentPolicies: updateAgentPoliciesMock,
      setSelectedPolicyTab: setSelectedPolicyTabMock,
      packagePolicy: {
        ...packagePolicyMock,
        name: 'endpoint-2',
      },
    });

    waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-2',
        supports_agentless: true,
      });
    });
  });

  it('should not create agentless policy if agentless feature is enabled and isCloud is true and agentless.api.url is not defined', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: false,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    waitForNextUpdate();
    expect(setNewAgentPolicy).toHaveBeenCalledTimes(0);
  });

  it('should not fetch agentless policy if agentless is enabled but serverless is disabled', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: false,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('should update agent policy and selected policy tab when setup technology is agentless', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: true,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    await waitForNextUpdate();

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(updateAgentPoliciesMock).toHaveBeenCalledWith([{ id: 'agentless-policy-id' }]);
    expect(setSelectedPolicyTabMock).toHaveBeenCalledWith(SelectedPolicyTab.EXISTING);
  });

  it('should update new agent policy and selected policy tab when setup technology is agent-based', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: true,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    await waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    expect(setNewAgentPolicy).toHaveBeenCalledWith(newAgentPolicyMock);
    expect(setSelectedPolicyTabMock).toHaveBeenCalledWith(SelectedPolicyTab.NEW);
  });

  it('should not update agent policy and selected policy tab when agentless is disabled', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: false,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: false,
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('should not update agent policy and selected policy tab when setup technology matches the current one ', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: true,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    await waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    expect(setNewAgentPolicy).not.toHaveBeenCalled();
    expect(setSelectedPolicyTabMock).not.toHaveBeenCalled();
  });

  it('should revert the agent policy name to the original value when switching from agentless back to agent-based', async () => {
    (useAgentless as MockFn).mockReturnValue({
      isAgentlessEnabled: true,
      isAgentlessApiEnabled: false,
      isDefaultAgentlessPolicyEnabled: true,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
      })
    );

    await waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);

    waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
      });
    });

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(setNewAgentPolicy).toHaveBeenCalledWith(newAgentPolicyMock);
  });
});
