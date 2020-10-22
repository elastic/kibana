/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { of } from 'rxjs';

import { TaskPollingLifecycle, claimAvailableTasks } from './polling_lifecycle';
import { createInitialMiddleware } from './lib/middleware';
import { TaskTypeDictionary } from './task_type_dictionary';
import { taskStoreMock } from './task_store.mock';
import { mockLogger } from './test_utils';

describe('TaskPollingLifecycle', () => {
  let clock: sinon.SinonFakeTimers;

  const taskManagerLogger = mockLogger();
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
    test('begins polling once start is called', () => {
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
      const logger = mockLogger();
      const claim = jest.fn(() => Promise.resolve({ docs: [], claimedTasks: 0 }));

      const availableWorkers = 1;

      claimAvailableTasks([], claim, availableWorkers, logger);

      expect(claim).toHaveBeenCalledTimes(1);
    });

    test('should not claim Available Tasks when there are no available workers', () => {
      const logger = mockLogger();
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
      const logger = mockLogger();
      const claim = jest.fn(() => {
        throw Object.assign(new Error(), {
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
