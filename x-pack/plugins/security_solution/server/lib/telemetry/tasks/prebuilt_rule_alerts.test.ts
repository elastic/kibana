/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryPrebuiltRuleAlertsTaskConfig } from './prebuilt_rule_alerts';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';

describe('security telemetry - detection rule alerts task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('detection rule alerts task should fetch recent alert data from elasticsearch', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetryDetectionRuleAlertsTaskConfig = createTelemetryPrebuiltRuleAlertsTaskConfig(1);

    await telemetryDetectionRuleAlertsTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );
  });
});
