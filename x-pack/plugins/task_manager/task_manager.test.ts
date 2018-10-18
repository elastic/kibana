/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { bindToElasticSearchStatus, TaskManager } from './task_manager';

describe('TaskManager', () => {
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
    const handlers: any = {};
    const es = {
      status: {
        on: (color: string, handler: any) => (handlers[color] = () => Promise.resolve(handler())),
      },
    };
    const start = sinon.spy(async () => undefined);
    const stop = sinon.spy(async () => undefined);
    const init = sinon.spy(async () => undefined);

    bindToElasticSearchStatus(es, { info: _.noop, debug: _.noop }, { stop, start }, { init });

    await handlers.green();
    sinon.assert.calledOnce(init);
    sinon.assert.calledOnce(start);
    sinon.assert.notCalled(stop);

    await handlers.red();
    sinon.assert.calledOnce(init);
    sinon.assert.calledOnce(start);
    sinon.assert.calledOnce(stop);

    await handlers.green();
    sinon.assert.calledTwice(init);
    sinon.assert.calledTwice(start);
    sinon.assert.calledOnce(stop);
  });

  test('disallows schedule before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    const task = {
      taskType: 'foo',
      params: {},
    };
    await expect(client.schedule(task)).rejects.toThrow(/The task manager is initializing/i);
  });

  test('disallows fetch before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    await expect(client.fetch({})).rejects.toThrow(/The task manager is initializing/i);
  });

  test('disallows remove before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    await expect(client.remove('23')).rejects.toThrow(/The task manager is initializing/i);
  });

  test('allows middleware registration before init', () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    expect(() => client.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after init', async () => {
    const { $test, opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };

    $test.afterPluginsInit();

    expect(() => client.addMiddleware(middleware)).toThrow(
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
      kbnServer: {
        uiExports: {
          taskDefinitions: {},
        },
        afterPluginsInit(callback: any) {
          $test.afterPluginsInit = callback;
        },
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
