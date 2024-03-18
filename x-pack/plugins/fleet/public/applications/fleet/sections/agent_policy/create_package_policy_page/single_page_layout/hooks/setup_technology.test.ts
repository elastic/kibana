/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { SetupTechnology } from '../../../../../../../../common/types';
import { ExperimentalFeaturesService } from '../../../../../services';
import { sendGetOneAgentPolicy, useStartServices } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';

import { useSetupTechnology } from './setup_technology';

jest.mock('../../../../../services');
jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  sendGetOneAgentPolicy: jest.fn(),
  useStartServices: jest.fn(),
}));

type MockFn = jest.MockedFunction<any>;

describe('useSetupTechnology', () => {
  const updateNewAgentPolicyMock = jest.fn();
  const updateAgentPolicyMock = jest.fn();
  const setSelectedPolicyTabMock = jest.fn();
  const newAgentPolicyMock = {
    name: 'mock_new_agent_policy',
    namespace: 'default',
  };
  const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      agentless: true,
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
        updateAgentPolicy: updateAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(result.current.agentlessPolicy).toBeUndefined();
  });

  it('should fetch agentless policy if agentless is enabled', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicy: updateAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    await waitForNextUpdate();

    expect(result.current.agentlessPolicy).toEqual({ id: 'agentless-policy-id' });
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
        updateAgentPolicy: updateAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    expect(sendGetOneAgentPolicy).not.toHaveBeenCalled();
    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(result.current.agentlessPolicy).toBeUndefined();
  });

  it('should update agent policy and selected policy tab when setup technology is agentless', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicy: updateAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
      })
    );

    await waitForNextUpdate();

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(updateAgentPolicyMock).toHaveBeenCalledWith({ id: 'agentless-policy-id' });
    expect(setSelectedPolicyTabMock).toHaveBeenCalledWith(SelectedPolicyTab.EXISTING);
  });

  it('should update new agent policy and selected policy tab when setup technology is agent-based', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSetupTechnology({
        updateNewAgentPolicy: updateNewAgentPolicyMock,
        newAgentPolicy: newAgentPolicyMock,
        updateAgentPolicy: updateAgentPolicyMock,
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
        updateAgentPolicy: updateAgentPolicyMock,
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
        updateAgentPolicy: updateAgentPolicyMock,
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
