/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellableTask, ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';

export class BidirectionalSyncTaskRunner implements CancellableTask {
  private taskInstance: ConcreteTaskInstance;

  constructor({ taskInstance }: { taskInstance: ConcreteTaskInstance }) {
    this.taskInstance = taskInstance;
  }

  public async run() {
    const { params, state } = this.taskInstance;
    console.log(`running task`, params, state);
  }
  public async cancel() {}
}
