/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { elasticsearchServiceMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers, Logger } from '@kbn/core/server';
import { ADJUST_THROUGHPUT_INTERVAL } from '../lib/create_managed_configuration';
import { TaskManagerPlugin, TaskManagerStartContract } from '../plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { TaskManagerConfig } from '../config';

describe('managed configuration', () => {
  let taskManagerStart: TaskManagerStartContract;
  let logger: Logger;

  let clock: sinon.SinonFakeTimers;
  const savedObjectsClient = savedObjectsRepositoryMock.create();
  const esStart = elasticsearchServiceMock.createStart();

  const inlineScriptError = new Error('cannot execute [inline] scripts" error') as Error & {
    meta: unknown;
  };
  inlineScriptError.meta = {
    body: {
      error: {
        caused_by: {
          reason: 'cannot execute [inline] scripts',
        },
      },
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers();

    const context = coreMock.createPluginInitializerContext<TaskManagerConfig>({
      max_workers: 10,
      max_attempts: 9,
      poll_interval: 3000,
      version_conflict_threshold: 80,
      max_poll_inactivity_cycles: 10,
      monitored_aggregated_stats_refresh_rate: 60000,
      monitored_stats_health_verbose_log: {
        enabled: false,
        warn_delayed_task_start_in_seconds: 60,
      },
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
      ephemeral_tasks: {
        enabled: true,
        request_capacity: 10,
      },
      unsafe: {
        exclude_task_types: [],
      },
      event_loop_delay: {
        monitor: true,
        warn_threshold: 5000,
      },
    });
    logger = context.logger.get('taskManager');

    const taskManager = new TaskManagerPlugin(context);
    (
      await taskManager.setup(coreMock.createSetup(), { usageCollection: undefined })
    ).registerTaskDefinitions({
      foo: {
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });

    const coreStart = coreMock.createStart();
    coreStart.elasticsearch = esStart;
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
      'Max workers configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Max workers configuration changing from 10 to 8 after seeing 1 "too many request" and/or "execute [inline] script" error(s)'
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
      'Poll interval configuration is temporarily increased after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Poll interval configuration changing from 3000 to 3600 after seeing 1 "too many request" and/or "execute [inline] script" error(s)'
    );
    expect(logger.debug).toHaveBeenCalledWith('Task poller now using interval of 3600ms');
  });

  test('should lower max workers when Elasticsearch returns "cannot execute [inline] scripts" error', async () => {
    esStart.client.asInternalUser.search.mockImplementationOnce(async () => {
      throw inlineScriptError;
    });

    await expect(taskManagerStart.fetch({})).rejects.toThrowErrorMatchingInlineSnapshot(
      `"cannot execute [inline] scripts\\" error"`
    );
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);

    expect(logger.warn).toHaveBeenCalledWith(
      'Max workers configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Max workers configuration changing from 10 to 8 after seeing 1 "too many request" and/or "execute [inline] script" error(s)'
    );
    expect(logger.debug).toHaveBeenCalledWith('Task pool now using 10 as the max worker value');
  });

  test('should increase poll interval when Elasticsearch returns "cannot execute [inline] scripts" error', async () => {
    esStart.client.asInternalUser.search.mockImplementationOnce(async () => {
      throw inlineScriptError;
    });

    await expect(taskManagerStart.fetch({})).rejects.toThrowErrorMatchingInlineSnapshot(
      `"cannot execute [inline] scripts\\" error"`
    );

    clock.tick(ADJUST_THROUGHPUT_INTERVAL);

    expect(logger.warn).toHaveBeenCalledWith(
      'Poll interval configuration is temporarily increased after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Poll interval configuration changing from 3000 to 3600 after seeing 1 "too many request" and/or "execute [inline] script" error(s)'
    );
    expect(logger.debug).toHaveBeenCalledWith('Task poller now using interval of 3600ms');
  });
});
