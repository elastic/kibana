/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, LoggerFactory } from '../../../../../../src/core/server';
import { TaskManagerSetupContract } from '../../../../../plugins/task_manager/server';

export class ExceptionsPackagerTask {
  private readonly logger?: Logger;
  private readonly taskManager?: TaskManagerSetupContract;

  constructor(logger: LoggerFactory, taskManager: TaskManagerSetupContract) {
    this.logger! = logger.get('exceptions_packager_task');
    this.taskManager! = taskManager;
  }

  public register() {
    this.taskManager!.registerTaskDefinitions({
      'endpoint:exceptions-packager': {
        title: 'SIEM Endpoint Exceptions Handler',
        type: 'endpoint:exceptions-packager',
        timeout: '1m',
        createTaskRunner: () => {
          return {
            run: async () => {
              await this.run();
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  private async run() {
    this.logger!.debug('HELLO WORLD');
  }
}
