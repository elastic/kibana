/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger } from '../../../../../../src/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../plugins/task_manager/server';

export interface PackagerTask {
  getTaskRunner: (taskManager: TaskManagerStartContract) => PackagerTaskRunner;
}

interface PackagerTaskRunner {
  run: () => void;
}

interface PackagerTaskContext {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}

export function setupPackagerTask(context: PackagerTaskContext): PackagerTask {
  const run = async () => {
    context.logger.debug('HELLO WORLD');
  };

  const getTaskRunner = (taskManager: TaskManagerStartContract) => {
    return {
      run: async () => {
        try {
          await taskManager.ensureScheduled({
            id: 'siem:endpoint:exceptions-packager',
            taskType: 'siem:endpoint:exceptions-packager',
            scope: ['siem'],
            schedule: {
              interval: '5s',
            },
            state: {},
            params: {},
          });
        } catch (e) {
          context.logger.debug(`Error scheduling task, received ${e.message}`);
        }
      },
    };
  };

  context.taskManager.registerTaskDefinitions({
    'siem:endpoint:exceptions-packager': {
      title: 'SIEM Endpoint Exceptions Handler',
      type: 'siem:endpoint:exceptions-packager',
      timeout: '1m',
      createTaskRunner: () => {
        return {
          run: async () => {
            await run();
          },
          cancel: async () => {},
        };
      },
    },
  });

  return {
    getTaskRunner,
  };
}
