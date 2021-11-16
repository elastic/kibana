/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { createTelemetryEndpointTaskConfig } from './endpoint';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('endpoint telemetry task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('endpoint telemetry task should fetch endpoint data', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryEndpointTaskConfig = createTelemetryEndpointTaskConfig(1);

    await telemetryEndpointTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchFleetAgents).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchEndpointMetrics).toHaveBeenCalledWith(
      testTaskExecutionPeriod.last,
      testTaskExecutionPeriod.current
    );
    expect(mockTelemetryReceiver.fetchEndpointPolicyResponses).toHaveBeenCalledWith(
      testTaskExecutionPeriod.last,
      testTaskExecutionPeriod.current
    );
  });
});
