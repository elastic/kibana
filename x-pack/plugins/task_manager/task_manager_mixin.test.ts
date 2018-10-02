/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { taskManagerMixin } from './task_manager_mixin';

describe('taskManagerMixin', () => {
  let clock: sinon.SinonFakeTimers;
  const defaultConfig = {
    task_manager: {
      max_workers: 10,
      override_num_workers: {},
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
    },
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('starts / stops the poller when es goes green / red', async () => {
    const { $test, opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    $test.afterPluginsInit();

    const { store, poller } = (opts.server as any).taskManager;

    store.init = sinon.spy(async () => undefined);
    poller.start = sinon.spy(async () => undefined);
    poller.stop = sinon.spy(async () => undefined);

    await $test.events.green();
    sinon.assert.calledOnce(store.init as any);
    sinon.assert.calledOnce(poller.start as any);
    sinon.assert.notCalled(poller.stop as any);

    await $test.events.red();
    sinon.assert.calledOnce(store.init as any);
    sinon.assert.calledOnce(poller.start as any);
    sinon.assert.calledOnce(poller.stop as any);

    await $test.events.green();
    sinon.assert.calledTwice(store.init as any);
    sinon.assert.calledTwice(poller.start as any);
    sinon.assert.calledOnce(poller.stop as any);
  });

  test('disallows schedule before init', async () => {
    const { opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    const { taskManager } = opts.server as any;
    const task = {
      taskType: 'foo',
      params: {},
    };
    await expect(taskManager.schedule(task)).rejects.toThrow(/The task manager is initializing/i);
  });

  test('disallows fetch before init', async () => {
    const { opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    const { taskManager } = opts.server as any;
    await expect(taskManager.fetch({})).rejects.toThrow(/The task manager is initializing/i);
  });

  test('disallows remove before init', async () => {
    const { opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    const { taskManager } = opts.server as any;
    await expect(taskManager.remove('23')).rejects.toThrow(/The task manager is initializing/i);
  });

  test('allows middleware registration before init', () => {
    const { opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    const { taskManager } = opts.server as any;
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    expect(() => taskManager.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after init', async () => {
    const { $test, opts } = testOpts();
    taskManagerMixin(opts.server, opts.config);
    const { taskManager } = opts.server as any;
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };

    $test.afterPluginsInit();

    expect(() => taskManager.addMiddleware(middleware)).toThrow(
      /Cannot add middleware after the task manager is initialized/i
    );
  });

  function testOpts() {
    const $test = {
      events: {} as any,
      afterPluginsInit: _.noop,
    };

    const opts = {
      config: {
        get: (path: string) => _.get(defaultConfig, path),
      },
      server: {
        log: sinon.spy(),
        decorate(...args: any[]) {
          _.set(opts, args.slice(0, -1), _.last(args));
        },
        plugins: {
          elasticsearch: {
            getCluster() {
              return { callWithInternalUser: _.noop };
            },
            status: {
              on(eventName: string, callback: () => any) {
                $test.events[eventName] = callback;
              },
            },
          },
        },
      },
    };

    return {
      $test,
      opts,
    };
  }
});
