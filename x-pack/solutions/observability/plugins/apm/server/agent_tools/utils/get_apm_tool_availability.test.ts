/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { getApmToolAvailability } from './get_apm_tool_availability';

jest.mock('./get_is_obs_agent_enabled', () => ({
  getIsObservabilityAgentEnabled: jest.fn(),
}));

jest.mock('./build_apm_tool_resources', () => ({
  buildApmToolResources: jest.fn(),
}));

import { getIsObservabilityAgentEnabled } from './get_is_obs_agent_enabled';
import { buildApmToolResources } from './build_apm_tool_resources';
const mockedGetIsObservabilityAgentEnabled = getIsObservabilityAgentEnabled as jest.MockedFunction<
  typeof getIsObservabilityAgentEnabled
>;
const mockedBuildApmToolResources = buildApmToolResources as jest.MockedFunction<
  typeof buildApmToolResources
>;

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const mockCore = coreMock.createSetup();
const plugins = {} as any;
const request = httpServerMock.createKibanaRequest();

describe('getApmToolAvailability', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns unavailable when feature flag is disabled', async () => {
    mockedGetIsObservabilityAgentEnabled.mockResolvedValue(false);
    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Feature flag/);
    expect(mockedBuildApmToolResources).not.toHaveBeenCalled();
  });

  it('returns available when feature flag enabled and historical data exists', async () => {
    mockedGetIsObservabilityAgentEnabled.mockResolvedValue(true);
    mockedBuildApmToolResources.mockResolvedValue({ hasHistoricalData: true } as any);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });
    expect(result.status).toBe('available');
  });

  it('returns unavailable when feature flag enabled but no historical data', async () => {
    mockedGetIsObservabilityAgentEnabled.mockResolvedValue(true);
    mockedBuildApmToolResources.mockResolvedValue({ hasHistoricalData: false } as any);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/No historical APM data/);
  });

  it('returns unavailable when availability check throws', async () => {
    mockedGetIsObservabilityAgentEnabled.mockResolvedValue(true);
    mockedBuildApmToolResources.mockRejectedValue(new Error('boom'));

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Failed observability agent availability check/);
  });
});
