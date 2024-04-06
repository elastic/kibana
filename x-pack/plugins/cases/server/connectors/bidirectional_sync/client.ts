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
}

export class BidirectionalSyncClient {
  private taskManager: TaskManagerStartContract;

  constructor({ taskManager }: { taskManager: TaskManagerStartContract }) {
    this.taskManager = taskManager;
  }

  private getTaskId({ caseId }: Pick<RegisterSynchingArgs, 'caseId'>) {
    return `cases-bi-di-sync:${caseId}`;
  }

  private getRunAt(): Date {
    const today = new Date();
    // run the task after 1 minutes
    today.setSeconds(today.getSeconds() + 10);

    return today;
  }

  public async registerSynching({ caseId }: RegisterSynchingArgs) {
    const id = this.getTaskId({ caseId });

    await this.taskManager.schedule({
      id,
      taskType: TASK_NAME,
      params: {
        caseId,
      },
      state: {},
      schedule: { interval: '10s' },
      runAt: this.getRunAt(),
    });
  }

  public async unregisterSynching({ caseId }: RegisterSynchingArgs) {
    const id = this.getTaskId({ caseId });

    await this.taskManager.removeIfExists(id);
  }
}
