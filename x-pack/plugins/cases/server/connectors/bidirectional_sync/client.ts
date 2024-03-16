/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TASK_NAME } from './constants';

interface RegisterSynchingArgs {
  caseId: string;
  connectorId: string;
}

export class BidirectionalSyncClient {
  private taskManager: TaskManagerStartContract;

  constructor({ taskManager }: { taskManager: TaskManagerStartContract }) {
    this.taskManager = taskManager;
  }

  private getTaskId({ caseId, connectorId }: Pick<RegisterSynchingArgs, 'caseId' | 'connectorId'>) {
    return `${caseId}:${connectorId}`;
  }

  private getRunAt(): Date {
    const today = new Date();
    // run the task after 1 minutes
    today.setMinutes(today.getMinutes() + 1);

    return today;
  }

  public async registerSynching({ caseId, connectorId }: RegisterSynchingArgs) {
    const id = this.getTaskId({ caseId, connectorId });

    await this.taskManager.schedule({
      id,
      taskType: TASK_NAME,
      params: {},
      state: {},
      schedule: { interval: '5m' },
      runAt: this.getRunAt(),
    });
  }

  public async unregisterSynching({ caseId, connectorId }: RegisterSynchingArgs) {
    const id = this.getTaskId({ caseId, connectorId });

    await this.taskManager.removeIfExists(id);
  }
}
