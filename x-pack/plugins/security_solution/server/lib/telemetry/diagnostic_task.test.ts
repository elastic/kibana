/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { TaskStatus } from '../../../../task_manager/server';
import { TelemetryDiagTask, TelemetryDiagTaskConstants } from './diagnostic_task';
import { createMockTelemetryEventsSender, MockTelemetryDiagnosticTask } from './mocks';

describe('test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('basic diagnostic alert telemetry sanity checks', () => {
    test('diagnostic task can register', () => {
      const telemetryDiagTask = new TelemetryDiagTask(
        logger,
        taskManagerMock.createSetup(),
        createMockTelemetryEventsSender(true)
      );

      expect(telemetryDiagTask).toBeInstanceOf(TelemetryDiagTask);
    });
  });

  test('diagnostic task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryDiagTask(logger, mockTaskManager, createMockTelemetryEventsSender(true));

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('diagnostic task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryDiagTask = new TelemetryDiagTask(
      logger,
      mockTaskManagerSetup,
      createMockTelemetryEventsSender(true)
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryDiagTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });

  test('diagnostic task should run', async () => {
    const mockContext = createMockTelemetryEventsSender(true);
    const mockTaskManager = taskManagerMock.createSetup();
    const telemetryDiagTask = new MockTelemetryDiagnosticTask(logger, mockTaskManager, mockContext);

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

  test('diagnostic task should not query elastic if telemetry is not opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(false);
    const mockTaskManager = taskManagerMock.createSetup();
    new MockTelemetryDiagnosticTask(logger, mockTaskManager, mockSender);

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
    expect(mockSender.fetchDiagnosticAlerts).not.toHaveBeenCalled();
  });
});
