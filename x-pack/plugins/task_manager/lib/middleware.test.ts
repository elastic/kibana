/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ConcreteTaskInstance, RunContext, TaskInstance, TaskStatus } from '../task';
import { addMiddlewareToChain } from './middleware';

interface BeforeSaveOpts {
  taskInstance: TaskInstance;
}

const getMockTaskInstance = () => ({
  taskType: 'nice_task',
  params: { abc: 'def' },
});
const getMockConcreteTaskInstance = () => {
  const concrete: {
    id: string;
    version: number;
    attempts: number;
    status: TaskStatus;
    runAt: Date;
    state: any;
    taskType: string;
    params: any;
  } = {
    id: 'hy8o99o83',
    version: 1,
    attempts: 0,
    status: 'idle',
    runAt: new Date(moment('2018-09-18T05:33:09.588Z').valueOf()),
    state: {},
    taskType: 'nice_task',
    params: { abc: 'def' },
  };
  return concrete;
};
const getMockRunContext = (runTask: ConcreteTaskInstance) => ({
  taskInstance: runTask,
  kbnServer: {},
});

const defaultBeforeSave = async (opts: BeforeSaveOpts) => {
  return opts;
};

const defaultBeforeRun = async (opts: RunContext) => {
  return opts;
};

describe('addMiddlewareToChain', () => {
  it('chains the beforeSave functions', () => {
    const m1 = {
      beforeSave: async (opts: BeforeSaveOpts) => {
        Object.assign(opts.taskInstance.params, { m1: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
    };
    const m2 = {
      beforeSave: async (opts: BeforeSaveOpts) => {
        Object.assign(opts.taskInstance.params, { m2: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
    };
    const m3 = {
      beforeSave: async (opts: BeforeSaveOpts) => {
        Object.assign(opts.taskInstance.params, { m3: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
    };

    let middlewareChain;
    middlewareChain = addMiddlewareToChain(m1, m2);
    middlewareChain = addMiddlewareToChain(middlewareChain, m3);

    middlewareChain.beforeSave({ taskInstance: getMockTaskInstance() }).then(saveOpts => {
      expect(saveOpts).toMatchInlineSnapshot(`
Object {
  "taskInstance": Object {
    "params": Object {
      "abc": "def",
      "m1": true,
      "m2": true,
      "m3": true,
    },
    "taskType": "nice_task",
  },
}
`);
    });
  });

  it('chains the beforeRun functions', () => {
    const m1 = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts: RunContext) => {
        return {
          ...opts,
          m1: true,
        };
      },
    };
    const m2 = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts: RunContext) => {
        return {
          ...opts,
          m2: true,
        };
      },
    };
    const m3 = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts: RunContext) => {
        return {
          ...opts,
          m3: true,
        };
      },
    };

    let middlewareChain;
    middlewareChain = addMiddlewareToChain(m1, m2);
    middlewareChain = addMiddlewareToChain(middlewareChain, m3);

    middlewareChain
      .beforeRun(getMockRunContext(getMockConcreteTaskInstance()))
      .then(contextOpts => {
        expect(contextOpts).toMatchInlineSnapshot(`
Object {
  "kbnServer": Object {},
  "m1": true,
  "m2": true,
  "m3": true,
  "taskInstance": Object {
    "attempts": 0,
    "id": "hy8o99o83",
    "params": Object {
      "abc": "def",
    },
    "runAt": 2018-09-18T05:33:09.588Z,
    "state": Object {},
    "status": "idle",
    "taskType": "nice_task",
    "version": 1,
  },
}
`);
      });
  });
});
