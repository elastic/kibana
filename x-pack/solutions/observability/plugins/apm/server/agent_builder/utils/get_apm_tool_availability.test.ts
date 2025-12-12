/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { getApmToolAvailability } from './get_apm_tool_availability';

jest.mock('./build_apm_tool_resources', () => ({
  buildApmToolResources: jest.fn(),
}));

jest.mock('../../routes/historical_data/has_historical_agent_data', () => ({
  hasHistoricalAgentData: jest.fn(),
}));

import { buildApmToolResources } from './build_apm_tool_resources';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';

const mockedBuildApmToolResources = buildApmToolResources as jest.MockedFunction<
  typeof buildApmToolResources
>;
const mockedHasHistoricalAgentData = hasHistoricalAgentData as jest.MockedFunction<
  typeof hasHistoricalAgentData
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

    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as any,
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'oblt' }),
          },
        },
      },
    ]);
  });

  it('returns unavailable when space solution is Elasticsearch', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as any,
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'es' }),
          },
        },
      },
    ]);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Observability tools are not available in this space/);
    expect(mockedBuildApmToolResources).not.toHaveBeenCalled();
  });

  it('returns unavailable when space solution is Security', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as any,
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({ solution: 'security' }),
          },
        },
      },
    ]);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/Observability tools are not available in this space/);
    expect(mockedBuildApmToolResources).not.toHaveBeenCalled();
  });

  it('returns available when space solution is undefined', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as any,
      {
        spaces: {
          spacesService: {
            getActiveSpace: jest.fn().mockResolvedValue({}),
          },
        },
      },
    ]);

    mockedBuildApmToolResources.mockResolvedValue({ apmEventClient: {} } as any);
    mockedHasHistoricalAgentData.mockResolvedValue(true);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns available when allowed space and historical data exists', async () => {
    mockedBuildApmToolResources.mockResolvedValue({ apmEventClient: {} } as any);
    mockedHasHistoricalAgentData.mockResolvedValue(true);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns unavailable when allowed space but no historical data', async () => {
    mockedBuildApmToolResources.mockResolvedValue({ apmEventClient: {} } as any);
    mockedHasHistoricalAgentData.mockResolvedValue(false);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/No historical APM data/);
  });

  it('returns available when spaces plugin is unavailable but historical data exists', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as any,
      {} as any,
    ]);
    mockedBuildApmToolResources.mockResolvedValue({ apmEventClient: {} } as any);
    mockedHasHistoricalAgentData.mockResolvedValue(true);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('available');
  });

  it('returns unavailable when AI agents feature flag is disabled', async () => {
    (mockCore.getStartServices as unknown as jest.Mock).mockResolvedValue([
      {
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
      } as any,
      {} as any,
    ]);

    const result = await getApmToolAvailability({
      core: mockCore,
      plugins,
      request,
      logger: mockLogger,
    });

    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/AI agents are disabled/);
    expect(mockedBuildApmToolResources).not.toHaveBeenCalled();
  });

  it('returns unavailable when availability check fails', async () => {
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
