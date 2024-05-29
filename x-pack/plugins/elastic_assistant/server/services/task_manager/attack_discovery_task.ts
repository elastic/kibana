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
const scope = 'elasticAssistantAttackDiscovery';
export const AttackDiscoveryTaskConstants = {
  TITLE: 'Attack Discovery Background Task',
  TYPE: 'elastic-assistant:attack-discovery-task',
  VERSION: '1.0.0',
  SCOPE: [scope],
  TIMEOUT: '20m',
};

export const AttackDiscoveryTaskId = `${AttackDiscoveryTaskConstants.TYPE}:${AttackDiscoveryTaskConstants.VERSION}`;
const taskManagerQuery = {
  bool: {
    filter: {
      bool: {
        must: [
          {
            term: {
              'task.scope': scope,
            },
          },
        ],
      },
    },
  },
};
export interface AttackDiscoveryTaskSetupContract {
  core: CoreSetup;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
}

/**
 * This task is responsible for running the attack discovery API in a background task.
 *
 */
export class AttackDiscoveryTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskManager?: TaskManagerStartContract;

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

  public async start(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;
  }

  public run = async () => {
    this.wasStarted = true;

    try {
      console.log('stephh schedule start');
      const currentTask = await this.taskManager?.schedule({
        taskType: AttackDiscoveryTaskConstants.TYPE,
        scope: AttackDiscoveryTaskConstants.SCOPE,
        // schedule: {
        //   interval: AttackDiscoveryTaskConstants.INTERVAL,
        // },
        state: {},
        params: { version: AttackDiscoveryTaskConstants.VERSION },
      });
      console.log('stephh schedule end', currentTask);

      // Removes the specified task
      if (currentTask) {
        // console.log('stephh remove end');
        // await this.taskManager?.remove(currentTask.id);
        // console.log('stephh remove end');
      }
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${AttackDiscoveryTaskConstants.TYPE}, received ${e.message}`
      );
    }
  };

  public async statusCheck() {
    try {
      console.log('stephh statusCheck start');
      const statusCheckResult = await this.taskManager?.fetch({
        query: taskManagerQuery,
      });
      console.log('stephh statusCheck ned', statusCheckResult);
    } catch (e) {
      this.logger.error(
        `Error status checking task ${AttackDiscoveryTaskConstants.TYPE}, received ${e.message}`
      );
    }
  }

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    console.log('stephh runTask start');
    this.logger.info(`runTask start ${AttackDiscoveryTaskConstants.TYPE}.`);
    this.logger.info(`runTask taskInstance ${JSON.stringify(taskInstance, null, 2)}.`);
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    try {
      const result = await resolveAfterManySeconds(60000);
      this.logger.info(`Successfully runTask ran attack discovery in ${result}`);
    } catch (err) {
      this.logger.error(`Failed runTask to run attack discovery: ${err}`);
      return;
    }

    this.logger.info(`Task completed successfully!`);

    const state = {};
    console.log('stephh runTask end');
    return { state };
  };

  private get taskId() {
    return AttackDiscoveryTaskId;
  }
}
function resolveAfterManySeconds(x: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`${x} milliseconds`);
    }, x);
  });
}
