/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskInstance } from './task';
import { TaskPool } from './task_pool';
import { FetchOpts, FetchResult, TaskStore } from './task_store';

interface Opts {
  pool: TaskPool;
  store: TaskStore;
}

export class TaskManager {
  private pool: TaskPool;
  private store: TaskStore;

  constructor(opts: Opts) {
    this.pool = opts.pool;
    this.store = opts.store;
  }

  public async schedule(task: TaskInstance) {
    await this.store.schedule(task);
    this.pool.checkForWork();
  }

  public fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    return this.store.fetch(opts);
  }

  public remove(id: string): Promise<void> {
    return this.store.remove(id);
  }
}
