/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryTimelineTaskConfig } from './timelines';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('timeline telemetry task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('timeline telemetry task should be correctly set up', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryTelemetryTaskConfig = createTelemetryTimelineTaskConfig();

    await telemetryTelemetryTaskConfig.runTask(
      'test-timeline-task-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.buildProcessTree).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchTimelineEvents).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchTimelineEndpointAlerts).toHaveBeenCalled();
    expect(mockTelemetryEventsSender.getTelemetryUsageCluster).toHaveBeenCalled();
    expect(mockTelemetryEventsSender.sendOnDemand).toHaveBeenCalled();
  });

  test('if no timeline events received it should not send a telemetry record', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver(null, true);
    const telemetryTelemetryTaskConfig = createTelemetryTimelineTaskConfig();

    await telemetryTelemetryTaskConfig.runTask(
      'test-timeline-task-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.buildProcessTree).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchTimelineEvents).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchTimelineEndpointAlerts).toHaveBeenCalled();
  });
});
