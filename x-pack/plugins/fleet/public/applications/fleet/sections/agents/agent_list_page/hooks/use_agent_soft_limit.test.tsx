/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../../../../../../mock';
import { useConfig, sendGetAgents } from '../../../../hooks';

import { useAgentSoftLimit } from './use_agent_soft_limit';

jest.mock('../../../../hooks');

const mockedSendGetAgents = jest.mocked(sendGetAgents);
const mockedUseConfig = jest.mocked(useConfig);

describe('useAgentSoftLimit', () => {
  beforeEach(() => {
    mockedSendGetAgents.mockReset();
    mockedUseConfig.mockReset();
  });
  it('should return shouldDisplayAgentSoftLimit:false if soft limit is not enabled in config', async () => {
    const renderer = createFleetTestRendererMock();
    mockedUseConfig.mockReturnValue({} as any);
    const { result } = renderer.renderHook(() => useAgentSoftLimit());

    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(false);

    expect(mockedSendGetAgents).not.toBeCalled();
  });

  it('should return shouldDisplayAgentSoftLimit:false if soft limit is enabled in config and there is less online agents than the limit', async () => {
    const renderer = createFleetTestRendererMock();
    mockedUseConfig.mockReturnValue({ internal: { activeAgentsSoftLimit: 10 } } as any);
    mockedSendGetAgents.mockResolvedValue({
      data: {
        total: 5,
      },
    } as any);
    const { result, waitForNextUpdate } = renderer.renderHook(() => useAgentSoftLimit());
    await waitForNextUpdate();

    expect(mockedSendGetAgents).toBeCalled();
    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(false);
  });

  it('should return shouldDisplayAgentSoftLimit:true if soft limit is enabled in config and there is more online agents than the limit', async () => {
    const renderer = createFleetTestRendererMock();
    mockedUseConfig.mockReturnValue({ internal: { activeAgentsSoftLimit: 10 } } as any);
    mockedSendGetAgents.mockResolvedValue({
      data: {
        total: 15,
      },
    } as any);
    const { result, waitForNextUpdate } = renderer.renderHook(() => useAgentSoftLimit());
    await waitForNextUpdate();

    expect(mockedSendGetAgents).toBeCalled();
    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(true);
  });
});
