/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { of } from 'rxjs';

import { TaskPollingLifecycle, claimAvailableTasks } from './polling_lifecycle';
import { loggingSystemMock } from '../../../../src/core/server/mocks';
import { createInitialMiddleware } from './lib/middleware';
import { TaskTypeDictionary } from './task_type_dictionary';
import { taskStoreMock } from './task_store.mock';

describe('TaskPollingLifecycle', () => {
  let clock: sinon.SinonFakeTimers;

  const taskManagerLogger = loggingSystemMock.create().get();
  const mockTaskStore = taskStoreMock.create({});
  const taskManagerOpts = {
    config: {
      enabled: true,
      max_workers: 10,
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
      max_poll_inactivity_cycles: 10,
      request_capacity: 1000,
      monitored_aggregated_stats_refresh_rate: 5000,
      monitored_stats_required_freshness: 5000,
      monitored_stats_running_average_window: 50,
    },
    taskStore: mockTaskStore,
    logger: taskManagerLogger,
    definitions: new TaskTypeDictionary(taskManagerLogger),
    middleware: createInitialMiddleware(),
    maxWorkersConfiguration$: of(100),
    pollIntervalConfiguration$: of(100),
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    taskManagerOpts.definitions = new TaskTypeDictionary(taskManagerLogger);
  });

  afterEach(() => clock.restore());

  describe('start', () => {
    test('begins poilling once start is called', () => {
      const taskManager = new TaskPollingLifecycle(taskManagerOpts);

      clock.tick(150);
      expect(mockTaskStore.claimAvailableTasks).not.toHaveBeenCalled();

      taskManager.start();

      clock.tick(150);
      expect(mockTaskStore.claimAvailableTasks).toHaveBeenCalled();
    });
  });

  describe('claimAvailableTasks', () => {
    test('should claim Available Tasks when there are available workers', () => {
      const logger = loggingSystemMock.create().get();
      const claim = jest.fn(() => Promise.resolve({ docs: [], claimedTasks: 0 }));

      const availableWorkers = 1;

      claimAvailableTasks([], claim, availableWorkers, logger);

      expect(claim).toHaveBeenCalledTimes(1);
    });

    test('should not claim Available Tasks when there are no available workers', () => {
      const logger = loggingSystemMock.create().get();
      const claim = jest.fn(() => Promise.resolve({ docs: [], claimedTasks: 0 }));

      const availableWorkers = 0;

      claimAvailableTasks([], claim, availableWorkers, logger);

      expect(claim).not.toHaveBeenCalled();
    });

    /**
     * This handles the case in which Elasticsearch has had inline script disabled.
     * This is achieved by setting the `script.allowed_types` flag on Elasticsearch to `none`
     */
    test('handles failure due to inline scripts being disabled', () => {
      const logger = loggingSystemMock.create().get();
      const claim = jest.fn(() => {
        throw Object.assign(new Error(), {
          msg: '[illegal_argument_exception] cannot execute [inline] scripts',
          path: '/.kibana_task_manager/_update_by_query',
          query: {
            ignore_unavailable: true,
            refresh: true,
            max_docs: 200,
            conflicts: 'proceed',
          },
          body:
            '{"query":{"bool":{"must":[{"term":{"type":"task"}},{"bool":{"must":[{"bool":{"should":[{"bool":{"must":[{"term":{"task.status":"idle"}},{"range":{"task.runAt":{"lte":"now"}}}]}},{"bool":{"must":[{"bool":{"should":[{"term":{"task.status":"running"}},{"term":{"task.status":"claiming"}}]}},{"range":{"task.retryAt":{"lte":"now"}}}]}}]}},{"bool":{"should":[{"exists":{"field":"task.schedule"}},{"bool":{"must":[{"term":{"task.taskType":"vis_telemetry"}},{"range":{"task.attempts":{"lt":3}}}]}},{"bool":{"must":[{"term":{"task.taskType":"lens_telemetry"}},{"range":{"task.attempts":{"lt":3}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.server-log"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.slack"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.email"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.index"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.pagerduty"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.webhook"}},{"range":{"task.attempts":{"lt":1}}}]}}]}}]}}]}},"sort":{"_script":{"type":"number","order":"asc","script":{"lang":"expression","source":"doc[\'task.retryAt\'].value || doc[\'task.runAt\'].value"}}},"seq_no_primary_term":true,"script":{"source":"ctx._source.task.ownerId=params.ownerId; ctx._source.task.status=params.status; ctx._source.task.retryAt=params.retryAt;","lang":"painless","params":{"ownerId":"kibana:5b2de169-2785-441b-ae8c-186a1936b17d","retryAt":"2019-10-31T13:35:43.579Z","status":"claiming"}}}',
          statusCode: 400,
          response:
            '{"error":{"root_cause":[{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}],"type":"search_phase_execution_exception","reason":"all shards failed","phase":"query","grouped":true,"failed_shards":[{"shard":0,"index":".kibana_task_manager_1","node":"24A4QbjHSK6prvtopAKLKw","reason":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}],"caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts","caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}},"status":400}',
        });
      });

      claimAvailableTasks([], claim, 10, logger);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
      );
    });
  });
});
