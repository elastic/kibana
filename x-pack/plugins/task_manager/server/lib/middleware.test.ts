/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ConcreteTaskInstance, RunContext, TaskStatus } from '../task';
import { addMiddlewareToChain, AfterRunContextFunction, Middleware } from './middleware';

const getMockTaskInstance = (): ConcreteTaskInstance => ({
  id: 'hy8o99o83',
  attempts: 0,
  status: TaskStatus.Idle,
  runAt: new Date(moment('2018-09-18T05:33:09.588Z').valueOf()),
  scheduledAt: new Date(moment('2018-09-18T05:33:09.588Z').valueOf()),
  startedAt: null,
  retryAt: null,
  state: {},
  taskType: 'nice_task',
  params: { abc: 'def' },
  ownerId: null,
});
const getMockConcreteTaskInstance = () => {
  const concrete: {
    id: string;
    sequenceNumber: number;
    primaryTerm: number;
    attempts: number;
    status: TaskStatus;
    runAt: Date;
    scheduledAt: Date;
    startedAt: Date | null;
    retryAt: Date | null;
    state: unknown;
    taskType: string;
    params: unknown;
    ownerId: string | null;
  } = {
    id: 'hy8o99o83',
    sequenceNumber: 1,
    primaryTerm: 1,
    attempts: 0,
    status: TaskStatus.Idle,
    runAt: new Date(moment('2018-09-18T05:33:09.588Z').valueOf()),
    scheduledAt: new Date(moment('2018-09-18T05:33:09.588Z').valueOf()),
    startedAt: null,
    retryAt: null,
    state: {},
    taskType: 'nice_task',
    params: { abc: 'def' },
    ownerId: null,
  };
  return concrete as unknown as ConcreteTaskInstance;
};
const getMockRunContext = (runTask: ConcreteTaskInstance) => ({
  taskInstance: runTask,
  kbnServer: {},
});

const defaultBeforeSave: Middleware<RunContext>['beforeSave'] = async (opts) => {
  return opts;
};

const defaultBeforeRun: Middleware<RunContext>['beforeRun'] = async (opts) => {
  return opts;
};

const defaultAfterRun: AfterRunContextFunction = async (opts) => {
  return opts;
};

describe('addMiddlewareToChain', () => {
  it('chains the beforeSave functions', async () => {
    // type MiddlewareMockContext = RunContext & { m1?: boolean; m2?: boolean };
    const m1: Middleware = {
      beforeSave: async (opts) => {
        Object.assign(opts.taskInstance.params, { m1: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
      afterRun: defaultAfterRun,
      beforeMarkRunning: defaultBeforeRun,
    };
    const m2: Partial<Middleware> = {
      beforeSave: async (opts) => {
        Object.assign(opts.taskInstance.params, { m2: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
      beforeMarkRunning: defaultBeforeRun,
    };
    const m3: Partial<Middleware> = {
      beforeSave: async (opts) => {
        Object.assign(opts.taskInstance.params, { m3: true });
        return opts;
      },
      beforeRun: defaultBeforeRun,
      beforeMarkRunning: defaultBeforeRun,
    };

    let middlewareChain;
    middlewareChain = addMiddlewareToChain(m1, m2);
    middlewareChain = addMiddlewareToChain(middlewareChain, m3);

    await middlewareChain
      .beforeSave({ taskInstance: getMockTaskInstance() })
      .then((saveOpts: unknown) => {
        expect(saveOpts).toMatchInlineSnapshot(`
          Object {
            "taskInstance": Object {
              "attempts": 0,
              "id": "hy8o99o83",
              "ownerId": null,
              "params": Object {
                "abc": "def",
                "m1": true,
                "m2": true,
                "m3": true,
              },
              "retryAt": null,
              "runAt": 2018-09-18T05:33:09.588Z,
              "scheduledAt": 2018-09-18T05:33:09.588Z,
              "startedAt": null,
              "state": Object {},
              "status": "idle",
              "taskType": "nice_task",
            },
          }
        `);
      });
  });

  it('chains the beforeRun functions', async () => {
    const m1: Middleware = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts) => {
        return {
          ...opts,
          m1: true,
        };
      },
      afterRun: defaultAfterRun,
      beforeMarkRunning: defaultBeforeRun,
    };
    const m2: Partial<Middleware> = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts) => {
        return {
          ...opts,
          m2: true,
        };
      },
      beforeMarkRunning: defaultBeforeRun,
    };
    const m3: Partial<Middleware> = {
      beforeSave: defaultBeforeSave,
      beforeRun: async (opts) => {
        return {
          ...opts,
          m3: true,
        };
      },
      beforeMarkRunning: defaultBeforeRun,
    };

    let middlewareChain;
    middlewareChain = addMiddlewareToChain(m1, m2);
    middlewareChain = addMiddlewareToChain(middlewareChain, m3);

    await middlewareChain
      .beforeRun(getMockRunContext(getMockConcreteTaskInstance()))
      .then((contextOpts) => {
        expect(contextOpts).toMatchInlineSnapshot(`
          Object {
            "kbnServer": Object {},
            "m1": true,
            "m2": true,
            "m3": true,
            "taskInstance": Object {
              "attempts": 0,
              "id": "hy8o99o83",
              "ownerId": null,
              "params": Object {
                "abc": "def",
              },
              "primaryTerm": 1,
              "retryAt": null,
              "runAt": 2018-09-18T05:33:09.588Z,
              "scheduledAt": 2018-09-18T05:33:09.588Z,
              "sequenceNumber": 1,
              "startedAt": null,
              "state": Object {},
              "status": "idle",
              "taskType": "nice_task",
            },
          }
        `);
      });
  });
});
