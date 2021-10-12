/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { TaskStatus } from '../../../../../task_manager/server';
import { taskManagerMock } from '../../../../../task_manager/server/mocks';

import { TelemetryEndpointTask, TelemetryEndpointTaskConstants } from './endpoint';
import {
  createMockTelemetryEventsSender,
  MockTelemetryEndpointTask,
  createMockTelemetryReceiver,
} from '../mocks';

describe('test', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('endpoint alert telemetry checks', () => {
    test('the endpoint task can register', () => {
      const telemetryEndpointTask = new TelemetryEndpointTask(
        logger,
        taskManagerMock.createSetup(),
        createMockTelemetryEventsSender(true),
        createMockTelemetryReceiver()
      );

      expect(telemetryEndpointTask).toBeInstanceOf(TelemetryEndpointTask);
    });
  });

  test('the endpoint task should be registered', () => {
    const mockTaskManager = taskManagerMock.createSetup();
    new TelemetryEndpointTask(
      logger,
      mockTaskManager,
      createMockTelemetryEventsSender(true),
      createMockTelemetryReceiver()
    );

    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalled();
  });

  test('the endpoint task should be scheduled', async () => {
    const mockTaskManagerSetup = taskManagerMock.createSetup();
    const telemetryEndpointTask = new TelemetryEndpointTask(
      logger,
      mockTaskManagerSetup,
      createMockTelemetryEventsSender(true),
      createMockTelemetryReceiver()
    );

    const mockTaskManagerStart = taskManagerMock.createStart();
    await telemetryEndpointTask.start(mockTaskManagerStart);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
  });

  test('endpoint task should not query elastic if telemetry is not opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(false);
    const mockTaskManager = taskManagerMock.createSetup();
    const mockReceiver = createMockTelemetryReceiver();
    new MockTelemetryEndpointTask(logger, mockTaskManager, mockSender, mockReceiver);

    const mockTaskInstance = {
      id: TelemetryEndpointTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetryEndpointTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][TelemetryEndpointTaskConstants.TYPE]
        .createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(mockReceiver.fetchEndpointMetrics).not.toHaveBeenCalled();
    expect(mockReceiver.fetchEndpointPolicyResponses).not.toHaveBeenCalled();
  });

  test('endpoint task should run when opted in', async () => {
    const mockSender = createMockTelemetryEventsSender(true);
    const mockTaskManager = taskManagerMock.createSetup();
    const mockReceiver = createMockTelemetryReceiver();
    const telemetryEpMetaTask = new MockTelemetryEndpointTask(
      logger,
      mockTaskManager,
      mockSender,
      mockReceiver
    );

    const mockTaskInstance = {
      id: TelemetryEndpointTaskConstants.TYPE,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {},
      taskType: TelemetryEndpointTaskConstants.TYPE,
    };
    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][TelemetryEndpointTaskConstants.TYPE]
        .createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
    await taskRunner.run();
    expect(telemetryEpMetaTask.runTask).toHaveBeenCalled();
  });
});
