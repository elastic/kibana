/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Worker<T> {
  id: string;
  timeout?: string;
  run: (params: T, abortSignal: AbortSignal) => Promise<void>;
}

export class WorkerRegistry {
  private readonly workers: Map<string, Worker<unknown>> = new Map();

  public has(id: string) {
    return this.workers.has(id);
  }

  public register(worker: Worker<unknown>) {
    if (this.has(worker.id)) {
      throw new Error(`Worker ${worker.id} is already registered.`);
    }
    this.workers.set(worker.id, worker);
  }

  public get<T>(id: string): Worker<T> {
    return this.workers.get(id) as Worker<T>;
  }
}
