/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FailedRunResult, RunContext, SuccessfulRunResult, TaskInstance } from '../task';
import { Result } from './result_type';

type Mapper<T> = (params: T) => Promise<T>;
interface BeforeSaveContext {
  taskInstance: TaskInstance;
}

interface AfterSaveParams<
  Context extends RunContext,
  Successful extends SuccessfulRunResult,
  Failed extends FailedRunResult
> {
  context: Context;
  result: Result<Successful, Failed>;
}

export type BeforeSaveContextFunction = Mapper<BeforeSaveContext>;
export type BeforeRunContextFunction<Context extends RunContext = RunContext> = Mapper<Context>;
export type AfterRunContextFunction<
  Context extends RunContext = RunContext,
  Successful extends SuccessfulRunResult = SuccessfulRunResult,
  Failed extends FailedRunResult = FailedRunResult
> = Mapper<AfterSaveParams<Context, Successful, Failed>>;

export interface Middleware<
  Context extends RunContext = RunContext,
  Successful extends SuccessfulRunResult = SuccessfulRunResult,
  Failed extends FailedRunResult = FailedRunResult
> {
  beforeSave: BeforeSaveContextFunction;
  beforeRun: BeforeRunContextFunction<Context>;
  afterRun: AfterRunContextFunction<Context, Successful, Failed>;
  beforeMarkRunning: BeforeRunContextFunction<Context>;
}

export function addMiddlewareToChain<Context extends RunContext = RunContext>(
  prev: Middleware<Context>,
  next: Partial<Middleware<Context>>
) {
  return {
    beforeSave: next.beforeSave ? chain(prev.beforeSave, next.beforeSave) : prev.beforeSave,
    beforeRun: next.beforeRun ? chain(prev.beforeRun, next.beforeRun) : prev.beforeRun,
    afterRun: next.afterRun ? chain(prev.afterRun, next.afterRun) : prev.afterRun,
    beforeMarkRunning: next.beforeMarkRunning
      ? chain(prev.beforeMarkRunning, next.beforeMarkRunning)
      : prev.beforeMarkRunning,
  };
}

const chain =
  <T>(prev: Mapper<T>, next: Mapper<T>): Mapper<T> =>
  (params) =>
    next(params).then(prev);

export function createInitialMiddleware(): Middleware<RunContext> {
  return {
    beforeSave: async (saveOpts) => saveOpts,
    beforeRun: async (runOpts) => runOpts,
    afterRun: async (afterSaveOpts) => afterSaveOpts,
    beforeMarkRunning: async (runOpts) => runOpts,
  };
}
