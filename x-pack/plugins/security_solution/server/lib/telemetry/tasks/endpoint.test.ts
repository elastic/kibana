/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryEndpointTaskConfig } from './endpoint';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
const telemetryUsageCounter = usageCountersServiceSetup.createUsageCounter(
  'testTelemetryUsageCounter'
);

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
    mockTelemetryEventsSender.getTelemetryUsageCluster = jest
      .fn()
      .mockReturnValue(telemetryUsageCounter);
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
    expect(mockTelemetryEventsSender.getTelemetryUsageCluster).toHaveBeenCalled();
    expect(mockTelemetryEventsSender.getTelemetryUsageCluster()?.incrementCounter).toBeCalledTimes(
      1
    );
  });
});
