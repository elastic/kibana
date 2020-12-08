/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { loggingSystemMock } from 'src/core/server/mocks';

import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { TaskStatus } from '../../../task_manager/server';

import { TelemetryDiagTask, TelemetryDiagTaskConstants } from './task';
import { TelemetryEventsSender } from './sender';

describe('test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('basic diagnostic alert telemetry sanity checks', () => {
    test('task can register', () => {
      const telemetryDiagTask = new TelemetryDiagTask(
        logger,
        taskManagerMock.createSetup(),
        new TelemetryEventsSender(logger)
      );

      expect(telemetryDiagTask).toBeInstanceOf(TelemetryDiagTask);
    });
  });

  test('diagnostic task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryDiagTask(logger, mockTaskManager, new TelemetryEventsSender(logger));

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryDiagTask = new TelemetryDiagTask(
      logger,
      mockTaskManagerSetup,
      new TelemetryEventsSender(logger)
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryDiagTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });

  test('task should run', async () => {
    const mockContext = new TelemetryEventsSender(logger);
    const mockTaskManager = taskManagerMock.createSetup();
    const telemetryDiagTask = new TelemetryDiagTask(logger, mockTaskManager, mockContext);

    const mockTaskInstance = {
      id: TelemetryDiagTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetryDiagTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][TelemetryDiagTaskConstants.TYPE]
        .createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(telemetryDiagTask.runTask).toHaveBeenCalled();
  });
});
