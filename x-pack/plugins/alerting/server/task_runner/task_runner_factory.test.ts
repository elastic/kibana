/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ConcreteTaskInstance, TaskStatus } from '../../../../plugins/task_manager/server';
import { TaskRunnerContext, TaskRunnerFactory } from './task_runner_factory';
import { encryptedSavedObjectsMock } from '../../../../plugins/encrypted_saved_objects/server/mocks';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';
import { actionsMock } from '../../../actions/server/mocks';
import { alertsMock } from '../mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';

const alertType = {
  id: 'test',
  name: 'My test alert',
  actionGroups: [{ id: 'default', name: 'Default' }],
  defaultActionGroupId: 'default',
  executor: jest.fn(),
  producer: 'alerting',
};
let fakeTimer: sinon.SinonFakeTimers;

describe('Task Runner Factory', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = {
      id: '',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsPlugin = encryptedSavedObjectsMock.createStart();
  const services = alertsMock.createAlertServices();

  const taskRunnerFactoryInitializerParams: jest.Mocked<TaskRunnerContext> = {
    getServices: jest.fn().mockReturnValue(services),
    actionsPlugin: actionsMock.createStart(),
    encryptedSavedObjectsClient: encryptedSavedObjectsPlugin.getClient(),
    logger: loggingServiceMock.create().get(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
    eventLogger: eventLoggerMock.create(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    taskRunnerFactoryInitializerParams.getServices.mockReturnValue(services);
  });

  test(`throws an error if factory isn't initialized`, () => {
    const factory = new TaskRunnerFactory();
    expect(() =>
      factory.create(alertType, { taskInstance: mockedTaskInstance })
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
  });

  test(`throws an error if factory is already initialized`, () => {
    const factory = new TaskRunnerFactory();
    factory.initialize(taskRunnerFactoryInitializerParams);
    expect(() =>
      factory.initialize(taskRunnerFactoryInitializerParams)
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
  });
});
