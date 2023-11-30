/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchTelemetryMetrics } from '@kbn/search-connectors';

import { registerTelemetryUsageCollector } from './telemetry';

jest.mock('@kbn/search-connectors', () => ({
  fetchTelemetryMetrics: jest.fn(),
}));

const mockLogger = {
  error: jest.fn(),
} as any;

describe('Connectors Serverless Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();
  const usageCollectionMock = {
    makeUsageCollector: makeUsageCollectorStub,
    registerCollector: registerStub,
  } as any;
  const clientMock = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryUsageCollector', () => {
    it('should make and register the usage collector', () => {
      registerTelemetryUsageCollector(usageCollectionMock, clientMock, mockLogger);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('connectors_serverless');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return telemetry data', async () => {
      (fetchTelemetryMetrics as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          native: { total: 5 },
          clients: { total: 2 },
        }))
      registerTelemetryUsageCollector(usageCollectionMock, clientMock, mockLogger);
      const telemetryMetrics = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(telemetryMetrics).toEqual({
        native: {
          total: 5,
        },
        clients: {
          total: 2,
        },
      });
    });
  });
});
