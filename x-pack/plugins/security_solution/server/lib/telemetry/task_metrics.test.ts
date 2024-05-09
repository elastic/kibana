/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ITaskMetricsService, TaskMetric } from './task_metrics.types';
import { TaskMetricsService } from './task_metrics';
import { createMockTelemetryEventsSender } from './__mocks__';
import type { ITelemetryEventsSender } from './sender';
import { telemetryConfiguration } from './configuration';

describe('task metrics', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let taskMetricsService: ITaskMetricsService;
  let mockTelemetryEventsSender: jest.Mocked<ITelemetryEventsSender>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockTelemetryEventsSender = createMockTelemetryEventsSender();
    taskMetricsService = new TaskMetricsService(logger, mockTelemetryEventsSender);
    jest.spyOn(telemetryConfiguration, 'use_async_sender', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start trace', async () => {
    const trace = taskMetricsService.start('test');
    expect(trace).toBeDefined();
    expect(trace.name).toEqual('test');
  });

  it('should record passed task metrics', async () => {
    const metric = await sendMetric('test');

    expect(metric.name).toEqual('test');
    expect(metric.passed).toBeTruthy();
    expect(metric.error_message).toBeUndefined();
    expect(metric.time_executed_in_ms).toBeGreaterThan(0);
    expect(metric.start_time).toBeGreaterThan(0);
    expect(metric.end_time).toBeGreaterThan(0);
  });

  it('should use legacy sender when feature flag is disabled', async () => {
    jest.spyOn(telemetryConfiguration, 'use_async_sender', 'get').mockReturnValue(false);

    const trace = taskMetricsService.start('test');
    await taskMetricsService.end(trace);
    expect(mockTelemetryEventsSender.sendAsync).toHaveBeenCalledTimes(0);

    expect(mockTelemetryEventsSender.sendAsync).toHaveBeenCalledTimes(0);
    expect(mockTelemetryEventsSender.sendOnDemand).toHaveBeenCalledTimes(1);
  });

  it('should record failed task metrics', async () => {
    const metric = await sendMetric('test', Error('Boom!'));

    expect(metric.name).toEqual('test');
    expect(metric.passed).toBeFalsy();
    expect(metric.error_message).toEqual('Boom!');
    expect(metric.time_executed_in_ms).toBeGreaterThan(0);
    expect(metric.start_time).toBeGreaterThan(0);
    expect(metric.end_time).toBeGreaterThan(0);
  });

  async function sendMetric(name: string, error?: Error): Promise<TaskMetric> {
    const trace = taskMetricsService.start(name);
    await taskMetricsService.end(trace, error);

    expect(mockTelemetryEventsSender.sendAsync).toHaveBeenCalledTimes(1);
    const events = mockTelemetryEventsSender.sendAsync.mock.calls[0][1];
    expect(events).toHaveLength(1);

    return events[0] as TaskMetric;
  }
});
