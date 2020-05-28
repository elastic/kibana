/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, LoggerFactory } from '../../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../../../plugins/task_manager/server';

export class ExceptionsPackagerTaskRunner {
  private readonly logger?: Logger;
  private readonly taskManager?: TaskManagerStartContract;

  constructor(logger: LoggerFactory, taskManager: TaskManagerStartContract) {
    this.logger! = logger.get('exceptions_packager_task_runner');
    this.taskManager! = taskManager;
  }

  public async schedule() {
    try {
      await this.taskManager!.ensureScheduled({
        id: 'siem-endpoint:exceptions-packager',
        taskType: 'endpoint:exceptions-packager',
        scope: ['siem'],
        schedule: {
          interval: '5s',
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger!.debug(`Error scheduling task, received ${e.message}`);
    }
  }
}
