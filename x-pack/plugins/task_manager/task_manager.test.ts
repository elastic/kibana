/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { TaskManager } from './task_manager';

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

  test('disallows schedule before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    await expect(client.schedule(task)).rejects.toThrow(/^NotInitialized: .*/i);
  });

  test('disallows fetch before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    await expect(client.fetch({})).rejects.toThrow(/^NotInitialized: .*/i);
  });

  test('disallows remove before init', async () => {
    const { opts } = testOpts();
    const client = new TaskManager(opts.kbnServer, opts.server, opts.config);
    await expect(client.remove('23')).rejects.toThrow(/^NotInitialized: .*/i);
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

    await $test.afterPluginsInit();

    expect(() => client.addMiddleware(middleware)).toThrow(
      /Cannot add middleware after the task manager is initialized/i
    );
  });

  function testOpts() {
    const callCluster = sinon.stub();
    callCluster.withArgs('indices.getTemplate').returns(Promise.resolve({ tasky: {} }));

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
              return { callWithInternalUser: callCluster };
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
