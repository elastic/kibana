/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';

export const ManifestTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'endpoint:user-artifact-packager',
  VERSION: '1.0.0',
};

export interface ManifestTaskSetupContract {
  taskManager: TaskManagerSetupContract;
}

export interface ManifestTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class ManifestTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: ManifestTaskSetupContract) {
    this.logger = this.endpointAppContext.logFactory.get(this.getTaskId());

    setupContract.taskManager.registerTaskDefinitions({
      [ManifestTaskConstants.TYPE]: {
        title: 'Security Solution Endpoint Exceptions Handler',
        timeout: ManifestTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return {
                state: {},
                schedule: { interval: '2m ' },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (startContract: ManifestTaskStartContract) => {
    this.wasStarted = true;

    try {
      await startContract.taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: ManifestTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: (await this.endpointAppContext.config()).packagerTaskInterval,
        },
        state: {},
        params: { version: ManifestTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(new EndpointError(`Error scheduling task, received ${e.message}`, e));
    }
  };

  private getTaskId = (): string => {
    return `${ManifestTaskConstants.TYPE}:${ManifestTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string) => {
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. ManifestTask not started yet');
      return;
    }

    // Check that this task is current
    if (taskId !== this.getTaskId()) {
      // old task, return
      this.logger.debug(`Outdated task running: ${taskId}`);
      return;
    }

    try {
    } catch (err) {
      this.logger.error(wrapErrorIfNeeded(err));
    }
  };
}
