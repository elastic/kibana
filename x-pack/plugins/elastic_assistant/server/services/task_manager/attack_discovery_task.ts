/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export const AttackDiscoveryTaskConstants = {
  TITLE: 'Attack Discovery Background Task',
  TYPE: 'elastic-assistant:attack-discovery-task',
  VERSION: '1.0.0',
  SCOPE: ['elasticAssistant'],
  TIMEOUT: '20m',
};

export interface AttackDiscoveryTaskSetupContract {
  core: CoreSetup;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
}

export interface AttackDiscoveryTaskStartContract {
  taskManager: TaskManagerStartContract;
}

/**
 * This task is responsible for running the attack discovery API in a background task.
 *
 */
export class AttackDiscoveryTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: AttackDiscoveryTaskSetupContract) {
    const { core, logFactory, taskManager } = setupContract;
    this.logger = logFactory.get(this.taskId);

    this.logger.info(
      `Registering ${AttackDiscoveryTaskConstants.TYPE} task with timeout of [${AttackDiscoveryTaskConstants.TIMEOUT}].`
    );

    try {
      taskManager.registerTaskDefinitions({
        [AttackDiscoveryTaskConstants.TYPE]: {
          title: AttackDiscoveryTaskConstants.TITLE,
          timeout: AttackDiscoveryTaskConstants.TIMEOUT,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
            this.logger.info(`createTaskRunner ${AttackDiscoveryTaskConstants.TYPE}.`);

            return {
              run: async () => {
                this.logger.info(`createTaskRunner run ${AttackDiscoveryTaskConstants.TYPE}.`);
                return this.runTask(taskInstance, core);
              },
              cancel: async () => {
                this.logger.info(`createTaskRunner cancel ${AttackDiscoveryTaskConstants.TYPE}.`);
                this.logger.warn(`${AttackDiscoveryTaskConstants.TYPE} task was cancelled`);
              },
            };
          },
        },
      });
      this.logger.info(`Registered ${AttackDiscoveryTaskConstants.TYPE} task successfully!`);
    } catch (err) {
      this.logger.error(`Failed to register ${AttackDiscoveryTaskConstants.TYPE} task, ${err}`);
    }
  }

  public start = async ({ taskManager }: AttackDiscoveryTaskStartContract) => {
    this.wasStarted = true;
    //
    // try {
    //   await taskManager.ensureScheduled({
    //     id: this.taskId,
    //     taskType: AttackDiscoveryTaskConstants.TYPE,
    //     scope: AttackDiscoveryTaskConstants.SCOPE,
    //     schedule: {
    //       interval: AttackDiscoveryTaskConstants.INTERVAL,
    //     },
    //     state: {},
    //     params: { version: AttackDiscoveryTaskConstants.VERSION },
    //   });
    // } catch (e) {
    //   this.logger.error(
    //     `Error scheduling task ${AttackDiscoveryTaskConstants.TYPE}, received ${e.message}`
    //   );
    // }
  };

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    this.logger.info(`runTask cancel ${AttackDiscoveryTaskConstants.TYPE}.`);
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    try {
      this.logger.info(`Successfully ran attack discovery`);
    } catch (err) {
      this.logger.error(`Failed to run attack discovery: ${err}`);
      return;
    }

    this.logger.info(`Task completed successfully!`);

    const state = {};
    return { state };
  };

  private get taskId() {
    return `${AttackDiscoveryTaskConstants.TYPE}:${AttackDiscoveryTaskConstants.VERSION}`;
  }
}
