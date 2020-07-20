/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskStore } from './task_store';
import { ConcreteTaskInstance } from './task';
import { Updatable } from './task_runner';
import { createBuffer, Operation, BufferOptions } from './lib/bulk_operation_buffer';
import { unwrapPromise } from './lib/result_type';

// by default allow updates to be buffered for up to 50ms
const DEFAULT_BUFFER_MAX_DURATION = 50;

export class BufferedTaskStore implements Updatable {
  private bufferedUpdate: Operation<ConcreteTaskInstance, Error>;
  constructor(private readonly taskStore: TaskStore, options: BufferOptions) {
    this.bufferedUpdate = createBuffer<ConcreteTaskInstance, Error>(
      (docs) => taskStore.bulkUpdate(docs),
      {
        bufferMaxDuration: DEFAULT_BUFFER_MAX_DURATION,
        ...options,
      }
    );
  }

  public get maxAttempts(): number {
    return this.taskStore.maxAttempts;
  }

  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    return unwrapPromise(this.bufferedUpdate(doc));
  }

  public async remove(id: string): Promise<void> {
    return this.taskStore.remove(id);
  }
}
