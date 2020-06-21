/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../../plugins/task_manager/server';
import { EndpointAppContext } from '../../types';
import { ExceptionsCache } from './cache';
import { refreshManifest } from './refresh';

const PackagerTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'securitySolution:endpoint:exceptions-packager',
  VERSION: '1.0.0',
};

export interface PackagerTask {
  getTaskRunner: (context: PackagerTaskRunnerContext) => PackagerTaskRunner;
}

interface PackagerTaskRunner {
  run: () => void;
}

interface PackagerTaskContext {
  endpointAppContext: EndpointAppContext;
  taskManager: TaskManagerSetupContract;
  cache: ExceptionsCache;
}

interface PackagerTaskRunnerContext {
  taskManager: TaskManagerStartContract;
}

export function setupPackagerTask(context: PackagerTaskContext): PackagerTask {
  const getTaskId = (): string => {
    return `${PackagerTaskConstants.TYPE}:${PackagerTaskConstants.VERSION}`;
  };

  const logger = context.endpointAppContext.logFactory.get(getTaskId());

  const run = async (taskId: string) => {
    // Check that this task is current
    if (taskId !== getTaskId()) {
      // old task, return
      logger.debug(`Outdated task running: ${taskId}`);
      return;
    }

    try {
      // await refreshManifest(context.endpointAppContext, false);
      // TODO: change this to 'false' when we hook up the ingestManager callback
      await refreshManifest(context.endpointAppContext, true);
    } catch (err) {
      logger.debug('Manifest not created yet, nothing to do.');
    }
  };

  const getTaskRunner = (runnerContext: PackagerTaskRunnerContext): PackagerTaskRunner => {
    return {
      run: async () => {
        const taskId = getTaskId();
        try {
          await runnerContext.taskManager.ensureScheduled({
            id: taskId,
            taskType: PackagerTaskConstants.TYPE,
            scope: ['securitySolution'],
            state: {},
            params: { version: PackagerTaskConstants.VERSION },
          });
        } catch (e) {
          logger.debug(`Error scheduling task, received ${e.message}`);
        }

        await runnerContext.taskManager.runNow(taskId);
      },
    };
  };

  context.taskManager.registerTaskDefinitions({
    [PackagerTaskConstants.TYPE]: {
      title: 'Security Solution Endpoint Exceptions Handler',
      type: PackagerTaskConstants.TYPE,
      timeout: PackagerTaskConstants.TIMEOUT,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          run: async () => {
            await run(taskInstance.id);

            const nextRun = new Date();
            const config = await context.endpointAppContext.config();
            nextRun.setSeconds(nextRun.getSeconds() + config.packagerTaskInterval);

            return {
              state: {},
              runAt: nextRun,
            };
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
