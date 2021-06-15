/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { TelemetryEndpointTask } from './endpoint_task';
import { createMockTelemetryEventsSender } from './mocks';

describe('test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('endpoint alert telemetry checks', () => {
    test('the task can register', () => {
      const telemetryEndpointTask = new TelemetryEndpointTask(
        logger,
        taskManagerMock.createSetup(),
        createMockTelemetryEventsSender(true)
      );

      expect(telemetryEndpointTask).toBeInstanceOf(TelemetryEndpointTask);
    });
  });

  test('the endpoint task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryEndpointTask(logger, mockTaskManager, createMockTelemetryEventsSender(true));

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('the endpoint task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryEndpointTask = new TelemetryEndpointTask(
      logger,
      mockTaskManagerSetup,
      createMockTelemetryEventsSender(true)
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryEndpointTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });
});
