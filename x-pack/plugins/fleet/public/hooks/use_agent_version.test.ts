/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useAgentVersion } from './use_agent_version';
import { useKibanaVersion } from './use_kibana_version';
import { sendGetAgentsAvailableVersions } from './use_request';

jest.mock('./use_kibana_version');
jest.mock('./use_request');

describe('useAgentVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return agent version that matches Kibana version if released', async () => {
    const mockKibanaVersion = '8.8.1';
    const mockAvailableVersions = ['8.9.0', '8.8.1', '8.8.0', '8.7.0'];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual(mockKibanaVersion);
  });

  it('should return agent version with newer patch than kibana', async () => {
    const mockKibanaVersion = '8.8.1';
    const mockAvailableVersions = ['8.9.0', '8.8.2', '8.8.0', '8.7.0'];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.8.2');
  });

  it('should return the latest availeble agent version if a version that matches Kibana version is not released', async () => {
    const mockKibanaVersion = '8.11.0';
    const mockAvailableVersions = ['8.8.0', '8.7.0', '8.9.2', '7.16.0'];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.9.2');
  });

  it('should return the agent version that is <= Kibana version if an agent version that matches Kibana version is not released', async () => {
    const mockKibanaVersion = '8.8.3';
    const mockAvailableVersions = ['8.8.0', '8.8.1', '8.8.2', '8.7.0', '8.9.2', '7.16.0'];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.8.2');
  });

  it('should return the latest availeble agent version if a snapshot version', async () => {
    const mockKibanaVersion = '8.10.0-SNAPSHOT';
    const mockAvailableVersions = ['8.8.0', '8.7.0', '8.9.2', '7.16.0'];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.9.2');
  });

  it('should return kibana version if no agent versions available', async () => {
    const mockKibanaVersion = '8.11.0';
    const mockAvailableVersions: string[] = [];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.11.0');
  });

  it('should return kibana version if the list of available agent versions is not available', async () => {
    const mockKibanaVersion = '8.11.0';

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockRejectedValue(new Error('Fetching error'));

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();
    await waitForNextUpdate();

    expect(result.current).toEqual(mockKibanaVersion);
  });

  it('should return the latest availeble agent version if has build suffix', async () => {
    const mockKibanaVersion = '8.11.0';
    const mockAvailableVersions = [
      '8.12.0',
      '8.11.1+build123456789',
      '8.8.0',
      '8.7.0',
      '8.9.2',
      '7.16.0',
    ];

    (useKibanaVersion as jest.Mock).mockReturnValue(mockKibanaVersion);
    (sendGetAgentsAvailableVersions as jest.Mock).mockResolvedValue({
      data: { items: mockAvailableVersions },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAgentVersion());

    expect(sendGetAgentsAvailableVersions).toHaveBeenCalled();

    await waitForNextUpdate();

    expect(result.current).toEqual('8.11.1+build123456789');
  });
});
