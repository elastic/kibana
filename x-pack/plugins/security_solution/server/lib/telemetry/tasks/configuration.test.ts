/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryConfigurationTaskConfig } from './configuration';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('telemetry configuration task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('diagnostics telemetry task should query and enqueue events', async () => {
    const testTaskExecutionPeriod = {
      last: new Date().toISOString(),
      current: new Date().toISOString(),
    };
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const telemetryDiagnoticsTaskConfig = createTelemetryConfigurationTaskConfig();

    await telemetryDiagnoticsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    // TODO: Add tests
  });
});
