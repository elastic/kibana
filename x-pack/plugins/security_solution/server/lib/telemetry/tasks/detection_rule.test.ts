/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { createTelemetryDetectionRuleListsTaskConfig } from './detection_rule';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('security detection rule task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('security detecttion rule task should fetch security list data', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryDetectionRuleListsTaskConfig = createTelemetryDetectionRuleListsTaskConfig(1);

    await telemetryDetectionRuleListsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchDetectionRules).toHaveBeenCalled();
  });
});
