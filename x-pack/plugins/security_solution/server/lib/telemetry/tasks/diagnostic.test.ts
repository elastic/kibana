/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryDiagnosticsTaskConfig } from './diagnostic';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('diagnostics telemetry task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('diagnostics telemetry task should query and enqueue events', async () => {
    const testAlertDoc1 = { id: 'test1' };
    const testAlertDoc2 = { id: 'test2' };
    const testDiagnosticsAlerts = {
      hits: { hits: [{ _source: [testAlertDoc1] }, { _source: [testAlertDoc2] }] },
    };
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver(testDiagnosticsAlerts);
    const telemetryDiagnoticsTaskConfig = createTelemetryDiagnosticsTaskConfig();

    await telemetryDiagnoticsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchDiagnosticAlerts).toHaveBeenCalledWith(
      testTaskExecutionPeriod.last,
      testTaskExecutionPeriod.current
    );

    expect(mockTelemetryEventsSender.queueTelemetryEvents).toHaveBeenCalledWith(
      testDiagnosticsAlerts.hits.hits.flatMap((doc) => [doc._source])
    );
  });
});
