/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import { RulesClient, ConstructorOptions } from './rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../src/core/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { alertingAuthorizationMock } from './authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { actionsClientMock, actionsAuthorizationMock } from '../../actions/server/mocks';
import { AlertingAuthorization } from './authorization/alerting_authorization';
import { ActionsAuthorization } from '../../actions/server';
import { SavedObjectsErrorHelpers } from '../../../../src/core/server';
import { RetryForConflictsAttempts } from './lib/retry_if_conflicts';
import { TaskStatus } from '../../task_manager/server/task';
import { RecoveredActionGroup } from '../common';

let rulesClient: RulesClient;

const MockAlertId = 'alert-id';

const ConflictAfterRetries = RetryForConflictsAttempts + 1;

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

const kibanaVersion = 'v7.10.0';
const logger = loggingSystemMock.create().get();
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  minimumScheduleInterval: '1m',
};

// this suite consists of two suites running tests against mutable RulesClient APIs:
// - one to run tests where an SO update conflicts once
// - one to run tests where an SO update conflicts too many times
describe('rules_client_conflict_retries', () => {
  // tests that mutable operations work if only one SO conflict occurs
  describe(`1 retry works for method`, () => {
    beforeEach(() => {
      mockSavedObjectUpdateConflictErrorTimes(1);
    });

    testFn(update, true);
    testFn(updateApiKey, true);
    testFn(enable, true);
    testFn(disable, true);
    testFn(muteAll, true);
    testFn(unmuteAll, true);
    testFn(muteInstance, true);
    testFn(unmuteInstance, true);
  });

  // tests that mutable operations fail if too many SO conflicts occurs
  describe(`${ConflictAfterRetries} retries fails with conflict error`, () => {
    beforeEach(() => {
      mockSavedObjectUpdateConflictErrorTimes(ConflictAfterRetries);
    });

    testFn(update, false);
    testFn(updateApiKey, false);
    testFn(enable, false);
    testFn(disable, false);
    testFn(muteAll, false);
    testFn(unmuteAll, false);
    testFn(muteInstance, false);
    testFn(unmuteInstance, false);
  });
});

// RulesClients methods being tested
// - success is passed as an indication if the RulesClient method
//   is expected to succeed or not, based on the number of conflicts
//   set up in the `beforeEach()` method

async function update(success: boolean) {
  try {
    await rulesClient.update({
      id: MockAlertId,
      data: {
        schedule: { interval: '1m' },
        name: 'cba',
        tags: ['bar'],
        params: { bar: true },
        throttle: '10s',
        notifyWhen: null,
        actions: [],
      },
    });
  } catch (err) {
    // only checking the warn messages in this test
    expect(logger.warn).lastCalledWith(`rulesClient.update('alert-id') conflict, exceeded retries`);
    return expectConflict(success, err, 'create');
  }
  expectSuccess(success, 3, 'create');

  // only checking the debug messages in this test
  expect(logger.debug).nthCalledWith(1, `rulesClient.update('alert-id') conflict, retrying ...`);
}

async function updateApiKey(success: boolean) {
  try {
    await rulesClient.updateApiKey({ id: MockAlertId });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

async function enable(success: boolean) {
  setupRawAlertMocks({}, { enabled: false });

  try {
    await rulesClient.enable({ id: MockAlertId });
  } catch (err) {
    return expectConflict(success, err);
  }

  // a successful enable call makes 2 calls to update, so that's 3 total,
  // 1 with conflict + 2 on success
  expectSuccess(success, 3);
}

async function disable(success: boolean) {
  try {
    await rulesClient.disable({ id: MockAlertId });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

async function muteAll(success: boolean) {
  try {
    await rulesClient.muteAll({ id: MockAlertId });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

async function unmuteAll(success: boolean) {
  try {
    await rulesClient.unmuteAll({ id: MockAlertId });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

async function muteInstance(success: boolean) {
  try {
    await rulesClient.muteInstance({ alertId: MockAlertId, alertInstanceId: 'instance-id' });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

async function unmuteInstance(success: boolean) {
  setupRawAlertMocks({}, { mutedInstanceIds: ['instance-id'] });
  try {
    await rulesClient.unmuteInstance({ alertId: MockAlertId, alertInstanceId: 'instance-id' });
  } catch (err) {
    return expectConflict(success, err);
  }

  expectSuccess(success);
}

// tests to run when the method is expected to succeed
function expectSuccess(
  success: boolean,
  count: number = 2,
  method: 'update' | 'create' = 'update'
) {
  expect(success).toBe(true);
  expect(unsecuredSavedObjectsClient[method]).toHaveBeenCalledTimes(count);
  // message content checked in the update test
  expect(logger.debug).toHaveBeenCalled();
}

// tests to run when the method is expected to fail
function expectConflict(success: boolean, err: Error, method: 'update' | 'create' = 'update') {
  const conflictErrorMessage = SavedObjectsErrorHelpers.createConflictError(
    'alert',
    MockAlertId
  ).message;

  expect(`${err}`).toBe(`Error: ${conflictErrorMessage}`);
  expect(success).toBe(false);
  expect(unsecuredSavedObjectsClient[method]).toHaveBeenCalledTimes(ConflictAfterRetries);
  // message content checked in the update test
  expect(logger.debug).toBeCalledTimes(RetryForConflictsAttempts);
  expect(logger.warn).toBeCalledTimes(1);
}

// wrapper to call the test function with a it's own name
function testFn(fn: (success: boolean) => unknown, success: boolean) {
  test(`${fn.name}`, async () => await fn(success));
}

// set up mocks for update or create (the update() method uses create!)
function mockSavedObjectUpdateConflictErrorTimes(times: number) {
  // default success value
  const mockUpdateValue = {
    id: MockAlertId,
    type: 'alert',
    attributes: {
      actions: [],
      scheduledTaskId: 'scheduled-task-id',
    },
    references: [],
  };

  unsecuredSavedObjectsClient.update.mockResolvedValue(mockUpdateValue);
  unsecuredSavedObjectsClient.create.mockResolvedValue(mockUpdateValue);

  // queue up specified number of errors before a success call
  for (let i = 0; i < times; i++) {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('alert', MockAlertId)
    );
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('alert', MockAlertId)
    );
  }
}

// set up mocks needed to get the tested methods to run
function setupRawAlertMocks(
  overrides: Record<string, unknown> = {},
  attributeOverrides: Record<string, unknown> = {}
) {
  const rawAlert = {
    id: MockAlertId,
    type: 'alert',
    attributes: {
      enabled: true,
      tags: ['foo'],
      alertTypeId: 'myType',
      schedule: { interval: '1m' },
      consumer: 'myApp',
      scheduledTaskId: 'task-123',
      params: {},
      throttle: null,
      actions: [],
      muteAll: false,
      mutedInstanceIds: [],
      ...attributeOverrides,
    },
    references: [],
    version: '123',
    ...overrides,
  };
  const decryptedRawAlert = {
    ...rawAlert,
    attributes: {
      ...rawAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  unsecuredSavedObjectsClient.get.mockReset();
  encryptedSavedObjects.getDecryptedAsInternalUser.mockReset();

  // splitting this out as it's easier to set a breakpoint :-)
  // eslint-disable-next-line prettier/prettier
  unsecuredSavedObjectsClient.get.mockImplementation(async () =>
    cloneDeep(rawAlert)
  );

  encryptedSavedObjects.getDecryptedAsInternalUser.mockImplementation(async () =>
    cloneDeep(decryptedRawAlert)
  );
}

// setup for each test
beforeEach(() => {
  jest.resetAllMocks();

  rulesClientParams.createAPIKey.mockResolvedValue({ apiKeysEnabled: false });
  rulesClientParams.getUserName.mockResolvedValue('elastic');

  taskManager.runNow.mockResolvedValue({ id: '' });
  taskManager.schedule.mockResolvedValue({
    id: 'scheduled-task-id',
    scheduledAt: new Date(),
    attempts: 0,
    status: TaskStatus.Idle,
    runAt: new Date(),
    startedAt: null,
    retryAt: null,
    state: {},
    ownerId: null,
    taskType: 'task-type',
    params: {},
  });

  taskManager.get.mockResolvedValue({
    id: 'task-123',
    taskType: 'alerting:123',
    scheduledAt: new Date(),
    attempts: 1,
    status: TaskStatus.Idle,
    runAt: new Date(),
    startedAt: null,
    retryAt: null,
    state: {},
    params: {
      alertId: '1',
    },
    ownerId: null,
  });

  const actionsClient = actionsClientMock.create();
  actionsClient.getBulk.mockResolvedValue([]);
  rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);

  ruleTypeRegistry.get.mockImplementation((id) => ({
    id: '123',
    name: 'Test',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    async executor() {},
    producer: 'alerts',
  }));

  ruleTypeRegistry.get.mockReturnValue({
    id: 'myType',
    name: 'Test',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    async executor() {},
    producer: 'alerts',
  });

  rulesClient = new RulesClient(rulesClientParams);

  setupRawAlertMocks();
});
