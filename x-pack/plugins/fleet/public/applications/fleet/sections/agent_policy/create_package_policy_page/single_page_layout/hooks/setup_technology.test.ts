/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { SetupTechnology } from '../../../../../../../../common/types';
import { ExperimentalFeaturesService } from '../../../../../services';
import { sendGetOneAgentPolicy, useStartServices, useConfig } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';

import { useSetupTechnology } from './setup_technology';

jest.mock('../../../../../services');
jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  sendGetOneAgentPolicy: jest.fn(),
  useStartServices: jest.fn(),
  useConfig: jest.fn(),
}));
jest.mock('../../../../../../../../common/services/generate_new_agent_policy');

type MockFn = jest.MockedFunction<any>;

describe('useSetupTechnology', () => {
  const updateNewAgentPolicyMock = jest.fn();
  const updateAgentPoliciesMock = jest.fn();
  const setSelectedPolicyTabMock = jest.fn();
  const newAgentPolicyMock = {
    name: 'mock_new_agent_policy',
    namespace: 'default',
    is_managed: false,
    supports_agentless: false,
  };
  const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: true,
    } as any);
    (useConfig as MockFn).mockReturnValue({
      agentless: undefined,
    } as any);
    (sendGetOneAgentPolicy as MockFn).mockResolvedValue({
      data: {
        item: { id: 'agentless-policy-id' },
      },
    });
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
      },
    });

    (generateNewAgentPolicyWithDefaults as MockFn).mockReturnValue({
      name: 'mock_new_agentless_policy',
      supports_agentless: true,
    });
    jest.clearAllMocks();
  });

  it('should initialize with default values when agentless is disabled', () => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: false,
    } as any);

    const { result } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(result.current.isAgentlessEnabled).toBeFalsy();
  });

  it('should fetch agentless policy if agentless feature is enabled and isServerless is true', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    await waitForNextUpdate();

    expect(sendGetOneAgentPolicy).toHaveBeenCalled();
    expect(result.current.isAgentlessEnabled).toBeTruthy();
  });

  it('should create agentless policy if agentless feature is enabled and isCloud is true and agentless.api.url', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        // isServerlessEnabled: false,
        isCloudEnabled: true,
      },
    });
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(result.current.isAgentlessEnabled).toBeTruthy();
    expect(generateNewAgentPolicyWithDefaults).toHaveBeenCalled();

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });
    waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    expect(updateNewAgentPolicyMock).toHaveBeenCalledWith({
      name: 'mock_new_agentless_policy',
      supports_agentless: true,
    });
  });

  it('should not create agentless policy if agentless feature is enabled and isCloud is true and agentless.api.url is not defined', async () => {
    (useConfig as MockFn).mockReturnValue({} as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(result.current.isAgentlessEnabled).toBeFalsy();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });
    waitForNextUpdate();
  });

  it('should not fetch agentless policy if agentless is enabled but serverless is disabled', async () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(result.current.isAgentlessEnabled).toBeFalsy();
  });

  it('should update agent policy and selected policy tab when setup technology is agentless', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
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
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
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

    expect(updateNewAgentPolicyMock).toHaveBeenCalledWith(newAgentPolicyMock);
    expect(setSelectedPolicyTabMock).toHaveBeenCalledWith(SelectedPolicyTab.NEW);
  });

  it('should not update agent policy and selected policy tab when agentless is disabled', async () => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: false,
    } as any);

    const { result } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('should not update agent policy and selected policy tab when setup technology matches the current one ', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicies: updateAgentPoliciesMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    await waitForNextUpdate();

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    expect(updateNewAgentPolicyMock).not.toHaveBeenCalled();
    expect(setSelectedPolicyTabMock).not.toHaveBeenCalled();
  });
});
