/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { savedObjectsRepositoryMock } from '../../../../../src/core/server/mocks';
import { SavedObjectsErrorHelpers, Logger } from '../../../../../src/core/server';
import { ADJUST_THROUGHPUT_INTERVAL } from '../lib/create_managed_configuration';
import { TaskManagerPlugin, TaskManagerStartContract } from '../plugin';
import { coreMock } from '../../../../../src/core/server/mocks';
import { TaskManagerConfig } from '../config';

describe('managed configuration', () => {
  let taskManagerStart: TaskManagerStartContract;
  let logger: Logger;

  let clock: sinon.SinonFakeTimers;
  const savedObjectsClient = savedObjectsRepositoryMock.create();

  beforeEach(async () => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers();

    const context = coreMock.createPluginInitializerContext<TaskManagerConfig>({
      enabled: true,
      max_workers: 10,
      index: 'foo',
      max_attempts: 9,
      poll_interval: 3000,
      version_conflict_threshold: 80,
      max_poll_inactivity_cycles: 10,
      monitored_aggregated_stats_refresh_rate: 60000,
      monitored_stats_required_freshness: 4000,
      monitored_stats_running_average_window: 50,
      request_capacity: 1000,
      monitored_task_execution_thresholds: {
        default: {
          error_threshold: 90,
          warn_threshold: 80,
        },
        custom: {},
      },
    });
    logger = context.logger.get('taskManager');

    const taskManager = new TaskManagerPlugin(context);
    (await taskManager.setup(coreMock.createSetup())).registerTaskDefinitions({
      foo: {
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });

    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockReturnValue(savedObjectsClient);
    taskManagerStart = await taskManager.start(coreStart);

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
      taskManagerStart.schedule({
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
      taskManagerStart.schedule({
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
