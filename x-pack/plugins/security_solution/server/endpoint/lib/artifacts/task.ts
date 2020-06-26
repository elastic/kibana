/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../../src/kibana/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../../plugins/task_manager/server';
import { EndpointAppContext } from '../../types';

const PackagerTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'securitySolution:endpoint:exceptions-packager',
  VERSION: '1.0.0',
};

export interface PackagerTask {
  getTaskScheduler: (context: PackagerTaskSchedulerContext) => PackagerTaskScheduler;
}

interface PackagerTaskScheduler {
  run: () => void;
}

interface PackagerTaskContext {
  endpointAppContext: EndpointAppContext;
  taskManager: TaskManagerSetupContract;
}

interface PackagerTaskSchedulerContext {
  taskManager: TaskManagerStartContract;
}

interface PackagerTaskRunnerContext extends PackagerTaskContext {
  logger: Logger;
  taskId: string;
}

const getTaskId = (): string => {
  return `${PackagerTaskConstants.TYPE}:${PackagerTaskConstants.VERSION}`;
};

export const runPackagerTask = async (context: PackagerTaskRunnerContext) => {
  // Check that this task is current
  if (context.taskId !== getTaskId()) {
    // old task, return
    context.logger.debug(`Outdated task running: ${context.taskId}`);
    return;
  }

  const manifestManager = context.endpointAppContext.service.getManifestManager();

  if (manifestManager === undefined) {
    context.logger.debug('Manifest Manager not available.');
    return;
  }

  manifestManager
    .refresh()
    .then((wrappedManifest) => {
      if (wrappedManifest !== null) {
        return manifestManager.dispatch(wrappedManifest);
      }
    })
    .then((wrappedManifest) => {
      if (wrappedManifest !== null) {
        return manifestManager.commit(wrappedManifest);
      }
    })
    .catch((err) => {
      context.logger.error(err);
    });
};

export const setupPackagerTask = (context: PackagerTaskContext): PackagerTask => {
  const logger = context.endpointAppContext.logFactory.get(getTaskId());
  const taskId = getTaskId();

  const getTaskScheduler = (
    schedulerContext: PackagerTaskSchedulerContext
  ): PackagerTaskScheduler => {
    return {
      run: async () => {
        try {
          await schedulerContext.taskManager.ensureScheduled({
            id: taskId,
            taskType: PackagerTaskConstants.TYPE,
            scope: ['securitySolution'],
            schedule: {
              // TODO: change this to '60s' before merging
              interval: '5s',
            },
            state: {},
            params: { version: PackagerTaskConstants.VERSION },
          });
        } catch (e) {
          logger.debug(`Error scheduling task, received ${e.message}`);
        }
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
            await runPackagerTask({ ...context, logger, taskId: taskInstance.id });
          },
          cancel: async () => {},
        };
      },
    },
  });

  return {
    getTaskScheduler,
  };
};
