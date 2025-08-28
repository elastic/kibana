/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import { handleAgentConfigurationSearch } from './handle_agent_configuration_search';
import type { AgentConfigSearchParams } from './route';
import { searchConfigurations } from './search_configurations';

jest.mock('./search_configurations', () => ({
  searchConfigurations: jest.fn(),
}));

const mockInternalESClient = {
  search: jest.fn(),
  index: jest.fn(),
} as unknown as APMInternalESClient;

const mockLogger = {
  debug: jest.fn(),
} as unknown as Logger;

describe('handleAgentConfigurationSearch', () => {
  const baseParams = {
    service: { name: 'test-service', environment: 'test-environment' },
    etag: '12345',
    mark_as_applied_by_agent: false,
    error: '',
  } as AgentConfigSearchParams;

  afterAll(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null if no configuration is found', async () => {
    (searchConfigurations as jest.Mock).mockResolvedValue(null);

    const result = await handleAgentConfigurationSearch({
      params: baseParams,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(result).toBeNull();
  });

  it('marks error and as not applied by agent if error is provided', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '12345', applied_by_agent: false },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    const paramsWithError = { ...baseParams, error: 'BOOM!!' };

    await handleAgentConfigurationSearch({
      params: paramsWithError,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(mockInternalESClient.index).toHaveBeenCalledWith('mark_configuration_error', {
      index: '.apm-agent-configuration',
      id: 'config-id',
      body: { etag: '12345', applied_by_agent: false, error: 'BOOM!!' },
    });
  });

  it('removes error when marked as applied by agent', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '12345', applied_by_agent: false, error: 'BOOM !!' },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    const paramsWithError = { ...baseParams, mark_as_applied_by_agent: true };

    await handleAgentConfigurationSearch({
      params: paramsWithError,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(mockInternalESClient.index).toHaveBeenCalledWith('mark_configuration_applied_by_agent', {
      index: '.apm-agent-configuration',
      id: mockConfiguration._id,
      body: { etag: '12345', applied_by_agent: true, error: undefined },
    });
  });

  it('does not mark as applied if etags do not match and mark_as_applied_by_agent is false', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '67890', applied_by_agent: false },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    const result = await handleAgentConfigurationSearch({
      params: baseParams,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(result).toEqual(mockConfiguration);
    expect(mockInternalESClient.index).not.toHaveBeenCalled();
  });

  it('marks as applied if etags match', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '12345', applied_by_agent: false },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    await handleAgentConfigurationSearch({
      params: baseParams,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(mockInternalESClient.index).toHaveBeenCalledWith('mark_configuration_applied_by_agent', {
      index: '.apm-agent-configuration',
      id: mockConfiguration._id,
      body: { etag: '12345', applied_by_agent: true, error: undefined },
    });
  });

  it('marks as applied if mark_as_applied_by_agent is true', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '67890', applied_by_agent: false },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    const paramsWithMarkApplied = { ...baseParams, mark_as_applied_by_agent: true };

    await handleAgentConfigurationSearch({
      params: paramsWithMarkApplied,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(mockInternalESClient.index).toHaveBeenCalledWith('mark_configuration_applied_by_agent', {
      index: '.apm-agent-configuration',
      id: mockConfiguration._id,
      body: { etag: '67890', applied_by_agent: true, error: undefined },
    });
  });

  it('does not mark as applied if applied_by_agent is already true', async () => {
    const mockConfiguration = {
      _id: 'config-id',
      _source: { etag: '12345', applied_by_agent: true },
    };
    (searchConfigurations as jest.Mock).mockResolvedValue(mockConfiguration);

    const result = await handleAgentConfigurationSearch({
      params: baseParams,
      internalESClient: mockInternalESClient,
      logger: mockLogger,
    });

    expect(result).toEqual(mockConfiguration);
    expect(mockInternalESClient.index).not.toHaveBeenCalled();
  });
});
