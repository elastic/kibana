/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { createTelemetrySecurityListTaskConfig } from './security_lists';
import { createMockTelemetryEventsSender, createMockTelemetryReceiver } from '../__mocks__';
import {
  ENDPOINT_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
} from '@kbn/securitysolution-list-constants';

describe('security list telemetry task test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('security list telemetry task should fetch security list data', async () => {
    const testTaskExecutionPeriod = {
      last: undefined,
      current: new Date().toISOString(),
    };
    const mockTelemetryEventsSender = createMockTelemetryEventsSender();
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const telemetrySecurityListTaskConfig = createTelemetrySecurityListTaskConfig(1);

    await telemetrySecurityListTaskConfig.runTask(
      'test-id',
      logger,
      mockTelemetryReceiver,
      mockTelemetryEventsSender,
      testTaskExecutionPeriod
    );

    expect(mockTelemetryReceiver.fetchTrustedApplications).toHaveBeenCalled();
    expect(mockTelemetryReceiver.fetchEndpointList).toHaveBeenCalledWith(ENDPOINT_LIST_ID);
    expect(mockTelemetryReceiver.fetchEndpointList).toHaveBeenCalledWith(
      ENDPOINT_EVENT_FILTERS_LIST_ID
    );
  });
});
