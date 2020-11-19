/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RunContext, TaskInstance } from '../task';

type Mapper<T> = (params: T) => Promise<T>;
interface BeforeSaveContext {
  taskInstance: TaskInstance;
}

export type BeforeSaveContextFunction = Mapper<BeforeSaveContext>;
export type BeforeRunContextFunction = Mapper<RunContext>;

export interface Middleware {
  beforeSave: BeforeSaveContextFunction;
  beforeRun: BeforeRunContextFunction;
  beforeMarkRunning: BeforeRunContextFunction;
}

export function addMiddlewareToChain(prev: Middleware, next: Partial<Middleware>) {
  return {
    beforeSave: next.beforeSave ? chain(prev.beforeSave, next.beforeSave) : prev.beforeSave,
    beforeRun: next.beforeRun ? chain(prev.beforeRun, next.beforeRun) : prev.beforeRun,
    beforeMarkRunning: next.beforeMarkRunning
      ? chain(prev.beforeMarkRunning, next.beforeMarkRunning)
      : prev.beforeMarkRunning,
  };
}

const chain = <T>(prev: Mapper<T>, next: Mapper<T>): Mapper<T> => (params) =>
  next(params).then(prev);

export function createInitialMiddleware(): Middleware {
  return {
    beforeSave: async (saveOpts: BeforeSaveContext) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
    beforeMarkRunning: async (runOpts: RunContext) => runOpts,
  };
}
