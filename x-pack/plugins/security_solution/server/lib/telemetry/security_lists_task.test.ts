/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { TaskStatus } from '../../../../task_manager/server';
import { taskManagerMock } from '../../../../task_manager/server/mocks';

import {
  TelemetryExceptionListsTask,
  TelemetrySecuityListsTaskConstants,
} from './security_lists_task';
import { createMockTelemetryEventsSender, MockExceptionListsTask } from './mocks';

describe('test exception list telemetry task functionality', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('the trusted apps task can register', () => {
    const telemetryTrustedAppsTask = new TelemetryExceptionListsTask(
      logger,
      taskManagerMock.createSetup(),
      createMockTelemetryEventsSender(true)
    );

    expect(telemetryTrustedAppsTask).toBeInstanceOf(TelemetryExceptionListsTask);
  });

  test('the exception list task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryExceptionListsTask(logger, mockTaskManager, createMockTelemetryEventsSender(true));

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('the exception list task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryTrustedAppsTask = new TelemetryExceptionListsTask(
      logger,
      mockTaskManagerSetup,
      createMockTelemetryEventsSender(true)
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryTrustedAppsTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });

  test('the exception list task should not query elastic if telemetry is not opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(false);
    const mockTaskManager = taskManagerMock.createSetup();
    new MockExceptionListsTask(logger, mockTaskManager, mockSender);

    const mockTaskInstance = {
      id: TelemetrySecuityListsTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetrySecuityListsTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][
        TelemetrySecuityListsTaskConstants.TYPE
      ].createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(mockSender.fetchTrustedApplications).not.toHaveBeenCalled();
  });

  test('the exception list task should query elastic if telemetry opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(true);
    const mockTaskManager = taskManagerMock.createSetup();
    const telemetryTrustedAppsTask = new MockExceptionListsTask(
      logger,
      mockTaskManager,
      mockSender
    );

    const mockTaskInstance = {
      id: TelemetrySecuityListsTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetrySecuityListsTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][
        TelemetrySecuityListsTaskConstants.TYPE
      ].createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(telemetryTrustedAppsTask.runTask).toHaveBeenCalled();
  });
});
