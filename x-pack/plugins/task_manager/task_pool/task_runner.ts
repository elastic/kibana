/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance, ElasticJs, RunContext, RunResult, TaskDefinition } from './task';
import { intervalFromNow } from './task_intervals';
import { TaskStore } from './task_store';

interface Logger {
  debug: (msg: string) => void;
  warning: (msg: string) => void;
}

interface Opts {
  logger: Logger;
  callCluster: ElasticJs;
  definition: TaskDefinition;
  instance: ConcreteTaskInstance;
  store: TaskStore;
}

export class TaskRunner {
  private promise?: Promise<RunResult>;
  private instance: ConcreteTaskInstance;
  private definition: TaskDefinition;
  private logger: Logger;
  private store: TaskStore;
  private context: RunContext;

  constructor(opts: Opts) {
    this.instance = opts.instance;
    this.definition = opts.definition;
    this.logger = opts.logger;
    this.store = opts.store;
    this.context = {
      callCluster: opts.callCluster,
      params: opts.instance.params || {},
      state: opts.instance.state || {},
    };
  }

  public get id() {
    return this.instance.id;
  }

  public get type() {
    return this.instance.type;
  }

  public get isTimedOut() {
    return this.instance.runAt < new Date();
  }

  public toString() {
    return `${this.instance.type} "${this.instance.id}"`;
  }

  public async run(): Promise<RunResult> {
    try {
      this.logger.debug(`Running task ${this}`);
      this.promise = this.definition.run(this.context);
      return this.processResult(this.validateResult(await this.promise));
    } catch (error) {
      this.logger.warning(`Task ${this} failed ${error.stack}`);
      this.logger.debug(`Task ${JSON.stringify(this.instance)} failed ${error.stack}`);

      return this.processResult({ error });
    }
  }

  public async claimOwnership() {
    const VERSION_CONFLICT_STATUS = 409;

    try {
      this.instance = await this.store.update({
        ...this.instance,
        status: 'running',
        runAt: intervalFromNow(this.definition.timeOut)!,
      });

      return true;
    } catch (error) {
      if (error.statusCode !== VERSION_CONFLICT_STATUS) {
        throw error;
      }
    }

    return false;
  }

  public async cancel() {
    const promise: any = this.promise;
    return promise && promise.cancel && promise.cancel();
  }

  private validateResult(result?: RunResult): RunResult {
    if (typeof result !== 'object' || !result) {
      this.logger.warning(`Task ${this} returned unexpected result ${result}`);
      return {};
    }

    return result;
  }

  private async processResult(result: RunResult): Promise<RunResult> {
    const runAt = result.runAt || intervalFromNow(this.instance.interval);
    const state = result.state || this.instance.state || {};

    if (runAt) {
      await this.store.update({
        ...this.instance,
        runAt,
        state,
        attempts: result.error ? this.instance.attempts + 1 : 0,
      });
    } else {
      await this.store.remove(this.instance.id);
    }

    return result;
  }
}
