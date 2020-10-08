/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { mockLogger } from '../test_utils';
import { TaskManager } from '../task_manager';
import { savedObjectsRepositoryMock } from '../../../../../src/core/server/mocks';
import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  SavedObjectsErrorHelpers,
} from '../../../../../src/core/server';
import { ADJUST_THROUGHPUT_INTERVAL } from '../lib/create_managed_configuration';

describe('managed configuration', () => {
  let taskManager: TaskManager;
  let clock: sinon.SinonFakeTimers;
  const callAsInternalUser = jest.fn();
  const logger = mockLogger();
  const serializer = new SavedObjectsSerializer(new SavedObjectTypeRegistry());
  const savedObjectsClient = savedObjectsRepositoryMock.create();
  const config = {
    enabled: true,
    max_workers: 10,
    index: 'foo',
    max_attempts: 9,
    poll_interval: 3000,
    max_poll_inactivity_cycles: 10,
    request_capacity: 1000,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    callAsInternalUser.mockResolvedValue({ total: 0, updated: 0, version_conflicts: 0 });
    clock = sinon.useFakeTimers();
    taskManager = new TaskManager({
      config,
      logger,
      serializer,
      callAsInternalUser,
      taskManagerId: 'some-uuid',
      savedObjectsRepository: savedObjectsClient,
    });
    taskManager.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    taskManager.start();
    // force rxjs timers to fire when they are scheduled for setTimeout(0) as the
    // sinon fake timers cause them to stall
    clock.tick(0);
  });

  afterEach(() => clock.restore());

  test('should lower max workers when Elasticsearch returns 429 error', async () => {
    savedObjectsClient.create.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b')
    );
    // Cause "too many requests" error to be thrown
    await expect(
      taskManager.schedule({
        taskType: 'foo',
        state: {},
        params: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Too Many Requests"`);
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);
    expect(logger.warn).toHaveBeenCalledWith(
      'Max workers configuration is temporarily reduced after Elasticsearch returned 1 "too many request" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Max workers configuration changing from 10 to 8 after seeing 1 error(s)'
    );
    expect(logger.debug).toHaveBeenCalledWith('Task pool now using 10 as the max worker value');
  });

  test('should increase poll interval when Elasticsearch returns 429 error', async () => {
    savedObjectsClient.create.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b')
    );
    // Cause "too many requests" error to be thrown
    await expect(
      taskManager.schedule({
        taskType: 'foo',
        state: {},
        params: {},
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Too Many Requests"`);
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);
    expect(logger.warn).toHaveBeenCalledWith(
      'Poll interval configuration is temporarily increased after Elasticsearch returned 1 "too many request" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Poll interval configuration changing from 3000 to 3600 after seeing 1 error(s)'
    );
    expect(logger.debug).toHaveBeenCalledWith('Task poller now using interval of 3600ms');
  });
});
