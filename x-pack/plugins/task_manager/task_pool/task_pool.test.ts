/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { startTaskPool, TaskPoolOpts } from './task_pool';
import { genDoc, mockStore, sleep } from './test_utils';
import { TaskDoc, TaskPoolStats, TaskStatus, TaskStore } from './types';

describe('startTaskPool', () => {
  const globalSetTimeout = global.setTimeout;
  let timeout = sinon.spy();

  beforeEach(() => {
    timeout = sinon.spy();

    // This is... super hacky, but seems like the best
    // way to test the polling logic properly.
    global.setTimeout = timeout;
  });

  afterEach(() => (global.setTimeout = globalSetTimeout));

  test('it requires pollInterval to be gte 1 second', () => {
    expect(() => testTaskPool({ pollInterval: 200 })).toThrow(
      /pollInterval must be at least 1000 milliseconds/
    );
  });

  test('it requires maxPoolSize to be gte 1', () => {
    expect(() => testTaskPool({ maxPoolSize: 0 })).toThrow(
      /maxPoolSize must be at least 1/
    );
  });

  test('it polls the index', async () => {
    const pollInterval = _.random(3000, 40000);
    const { store } = testTaskPool({ pollInterval });

    // Verifies that setTimeout is being run repeatedly
    function validateTimeout(n: number) {
      const [fn, interval] = timeout.args[n];
      expect(interval).toEqual(pollInterval);
      return fn;
    }

    const fetch = store.availableTasks as sinon.SinonSpy;

    await sleep();
    expect(fetch.callCount).toEqual(1);
    validateTimeout(0)();

    await sleep();
    expect(fetch.callCount).toEqual(2);
    validateTimeout(1)();

    await sleep();
    expect(fetch.callCount).toEqual(3);
    validateTimeout(2)();
  });

  test('it marks the task as running and sets timeOut', async () => {
    const interval = _.random(1, 42);
    const doc = {
      ...genDoc(),
      interval: `${interval}m`,
      status: 'idle' as TaskStatus,
    };

    const { waitForTask, store } = testTaskPool({
      batches: [[doc]],
    });

    await waitForTask(0);

    const update = (store.update as sinon.SinonSpy).args[0][0];
    expect(update.id).toEqual(doc.id);
    expect(update.type).toEqual(doc.type);
    expect(update.status).toEqual('running');
    expect(isMinsFromNow(update.timeOut, interval)).toBeTruthy();
  });

  test('it reschedules recurring tasks if they error', async () => {
    const interval = _.random(1, 42);
    const doc = {
      ...genDoc(),
      attempts: 2,
      interval: `${interval}m`,
      previousResult: { book: 'brain maker' },
      status: 'running' as TaskStatus,
    };

    const { log, waitForTask, store } = testTaskPool({
      batches: [[doc]],
      runTask: async () => {
        throw new Error('Dern!');
      },
    });

    await waitForTask(0);

    const storeUpdate = store.update as sinon.SinonSpy;

    expect(storeUpdate.callCount).toEqual(2);

    const update = storeUpdate.args[1][0];

    expect(update.id).toEqual(doc.id);
    expect(update.type).toEqual(doc.type);
    expect(update.status).toEqual('idle');
    expect(update.attempts).toEqual(3);
    expect(update.timeOut).toBeNull();
    expect(update.previousResult).toEqual({ book: 'brain maker' });
    expect(isMinsFromNow(update.nextRun, interval)).toBeTruthy();
    expect(JSON.stringify(log.args)).toMatch(
      /An error occurred while running task test_task:[0-9]+ of type test_task: Error: Dern!/
    );
  });

  test('it reschedules recurring tasks if they succeed', async () => {
    const interval = _.random(1, 42);
    const doc = {
      ...genDoc(),
      attempts: 2,
      interval: `${interval}m`,
      previousResult: { book: 'brain maker' },
      status: 'running' as TaskStatus,
    };

    const { waitForTask, store } = testTaskPool({
      batches: [[doc]],
      runTask: async () => ({ book: 'thing explainer' }),
    });

    await waitForTask(0);

    const storeUpdate = store.update as sinon.SinonSpy;

    expect(storeUpdate.callCount).toEqual(2);

    const update = storeUpdate.args[1][0];

    expect(update.id).toEqual(doc.id);
    expect(update.type).toEqual(doc.type);
    expect(update.status).toEqual('idle');
    expect(update.attempts).toEqual(0);
    expect(update.timeOut).toBeNull();
    expect(update.previousResult).toEqual({ book: 'thing explainer' });
    expect(isMinsFromNow(update.nextRun, interval)).toBeTruthy();
  });

  test('it deletes one-time tasks if they succeed', async () => {
    const doc = {
      ...genDoc(),
      interval: undefined,
    };

    const { waitForTask, store } = testTaskPool({
      batches: [[doc]],
      runTask: async () => ({}),
    });

    await waitForTask(0);

    const storeRemove = store.remove as sinon.SinonSpy;

    expect((store.update as sinon.SinonSpy).callCount).toEqual(1);
    expect(storeRemove.callCount).toEqual(1);
    expect(storeRemove.args[0][0]).toEqual(doc.id);
  });

  test('it deletes one-time tasks if they fail', async () => {
    const doc = {
      ...genDoc(),
      interval: undefined,
    };

    const { log, waitForTask, store } = testTaskPool({
      batches: [[doc]],
      runTask: async () => {
        throw new Error('Turds');
      },
    });

    await waitForTask(0);

    const storeRemove = store.remove as sinon.SinonSpy;

    expect((store.update as sinon.SinonSpy).callCount).toEqual(1);
    expect(storeRemove.callCount).toEqual(1);
    expect(storeRemove.args[0][0]).toEqual(doc.id);
    expect(JSON.stringify(log.args)).toMatch(
      /An error occurred while running task test_task:[0-9]+ of type test_task: Error: Turds/
    );
  });

  test('it runs maxPoolSize tasks at a time, if they are available', async () => {
    const maxPoolSize = _.random(2, 5);
    const numBatches = _.random(2, 5);
    const numDocs = maxPoolSize * numBatches;
    let maxActive = 0;
    let numActive = 0;
    let totalCount = 0;
    const { waitForTask } = testTaskPool({
      batches: _.range(numBatches).map(() => _.range(maxPoolSize).map(genDoc)),
      maxPoolSize,
      runTask: async () => {
        ++totalCount;
        ++numActive;
        await sleep();
        maxActive = Math.max(maxActive, numActive);
        --numActive;
      },
    });

    await waitForTask(numDocs - 1);

    expect(totalCount).toEqual(numDocs);
    expect(maxActive).toEqual(maxPoolSize);
  });
});

function isMinsFromNow(time: Date | null, mins: number) {
  const minsFromNow = Date.now() + mins * 60 * 1000;

  const buffer = 30000;

  if (!time) {
    throw new Error('Time was null');
  }

  if (time.getTime() > minsFromNow) {
    throw new Error(
      `Time was roughly ${time.getTime() -
        minsFromNow}ms greater than expected.`
    );
  }

  if (time.getTime() < minsFromNow - buffer) {
    throw new Error(
      `Time was roughly ${time.getTime() - minsFromNow}ms less than expected.`
    );
  }

  return true;
}

interface TestTaskPoolOpts {
  batches?: TaskDoc[][];
  maxPoolSize?: number;
  pollInterval?: number;
  runTask?: (args: any, task: TaskDoc) => Promise<any>;
}

interface TestTaskPool {
  store: TaskStore;
  waitForTask: (n: number) => Promise<any>;
  log: sinon.SinonSpy;
}

function testTaskPool(opts: TestTaskPoolOpts = {}): TestTaskPool {
  const { batches = [], maxPoolSize = 1, pollInterval = 3000, runTask } = opts;

  const allDocs = _.flatten(batches);

  const log = sinon.spy();

  // An array of observable work, used to assert
  // the order of work that was done.
  const tasks = allDocs.map((doc, i) => {
    // Ensure we know what index the doc is...
    doc.params = { i };

    const task: any = {
      doc,
      isDone: false,
    };

    task.promise = new Promise(resolve => (task.resolve = resolve));

    return task;
  });

  const store = mockStore(batches);

  const poolOpts = {
    log,
    maxPoolSize,
    pollInterval,
    store,
    taskDefinitions: {
      test_task: {
        run: sinon.spy(async (args: any) => {
          const task = tasks[args.params.i];

          task.isRunning = true;
          task.args = args;

          const promise = runTask && runTask(args, task);

          // This allows the pool to flush before
          // we resolve our promise.
          process.nextTick(() => {
            task.isDone = true;
            task.resolve();
          });

          return promise;
        }),
        title: 'Sample task',
        type: 'test_task',
      },
    },
  };

  startTaskPool(poolOpts);

  return {
    log,
    store,
    async waitForTask(n: number) {
      await tasks[n].promise;
    },
  };
}
