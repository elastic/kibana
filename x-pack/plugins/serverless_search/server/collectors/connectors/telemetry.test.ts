/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTelemetryUsageCollector } from './telemetry';

const error = {
  meta: {
    body: {
      error: {
        type: 'error',
      },
    },
  },
};

describe('Connectors Serverless Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();
  const usageCollectionMock = {
    makeUsageCollector: makeUsageCollectorStub,
    registerCollector: registerStub,
  } as any;
  const mockClient = {
    asInternalUser: {
      count: jest.fn(),
    },
  } as any;
  const mockLogger = {
    error: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryUsageCollector', () => {
    it('should make and register the usage collector', () => {
      registerTelemetryUsageCollector(usageCollectionMock, mockClient, mockLogger);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('connectors_serverless');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return telemetry data', async () => {
      mockClient.asInternalUser.count.mockImplementationOnce(() =>
        Promise.resolve({
          count: 5,
        })
      );
      mockClient.asInternalUser.count.mockImplementationOnce(() =>
        Promise.resolve({
          count: 2,
        })
      );
      registerTelemetryUsageCollector(usageCollectionMock, mockClient, mockLogger);
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
    it('should return default telemetry metrics on error', async () => {
      mockClient.asInternalUser.count.mockImplementationOnce(() => Promise.reject(error));
      registerTelemetryUsageCollector(usageCollectionMock, mockClient, mockLogger);
      const telemetryMetrics = await makeUsageCollectorStub.mock.calls[0][0].fetch();
      expect(telemetryMetrics).toEqual({
        native: {
          total: 0,
        },
        clients: {
          total: 0,
        },
      });
    });
  });
});
