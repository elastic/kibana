/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskStore } from './task_store';
import { ConcreteTaskInstance } from './task';
import { Updatable } from './task_runner';
import { createBuffer, Operation } from './lib/bulk_operation_buffer';
import { unwrapPromise, mapErr } from './lib/result_type';

export class BufferedTaskStore implements Updatable {
  private bufferedUpdate: Operation<ConcreteTaskInstance, Error>;
  constructor(private readonly taskStore: TaskStore) {
    this.bufferedUpdate = createBuffer<ConcreteTaskInstance, Error>(async (docs) => {
      return (await taskStore.bulkUpdate(docs)).map((entityOrError, index) =>
        mapErr(
          (error: Error) => ({
            entity: docs[index],
            error,
          }),
          entityOrError
        )
      );
    });
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
