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
} from '@kbn/task-manager-plugin/server';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { validate } from './validate';

interface CelProgram {
  formattedProgram: string;
}

export class ValidateCelTask {
  private VALIDATE_CEL_TASK_TYPE = 'wasmCelValidationTask';
  private VALIDATE_CEL_TASK_INDEX = '.kibana-wasm-cel-validation-program-index';
  private taskManagerStart: TaskManagerStartContract | undefined;
  private esClient: ElasticsearchClient | undefined;
  private logger: Logger;

  constructor({ logger, taskManager }: { logger: Logger; taskManager: TaskManagerSetupContract }) {
    this.logger = logger;
    taskManager.registerTaskDefinitions({
      [this.VALIDATE_CEL_TASK_TYPE]: {
        title: 'Validate CEL through WASM task',
        timeout: '1m',
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => this.runTask(taskInstance),
            cancel: async () => {},
          };
        },
      },
    });
  }

  private runTask = async (taskInstance: ConcreteTaskInstance) => {
    this.logger.info(`Start time in BG task: ${Date.now()}`);
    const { params, state } = taskInstance;
    if (params.celProgram) {
      const formattedProgram = await validate(this.logger, params.celProgram);
      const stateUpdated = {
        ...state,
        formattedProgram,
      };
      if (!this.esClient) {
        throw new Error('Elasticsearch client is not initialized');
      }

      await this.esClient.index(
        {
          index: this.VALIDATE_CEL_TASK_INDEX,
          document: { formattedProgram },
          id: taskInstance.id,
        },
        { meta: true }
      );
      this.logger.info(`End time in BG task: ${Date.now()}`);
      return {
        state: stateUpdated,
      };
    }
  };

  public startTaskManager = (
    taskManager?: TaskManagerStartContract,
    esClient?: ElasticsearchClient
  ) => {
    this.taskManagerStart = taskManager;
    this.esClient = esClient;
  };

  public validateCelProgram = async (celProgram: string): Promise<ConcreteTaskInstance> => {
    if (!this.taskManagerStart) {
      throw new Error('Task manager service is missing');
    }

    try {
      return await this.taskManagerStart.schedule({
        taskType: this.VALIDATE_CEL_TASK_TYPE,
        state: {},
        params: { celProgram },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${this.VALIDATE_CEL_TASK_TYPE}, received ${e.message}`
      );
      throw new Error(`Error scheduling task: ${e.message}`);
    }
  };

  public pollTaskManager = (taskInstance: ConcreteTaskInstance): Promise<string> => {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (!this.esClient) {
          throw new Error('Elasticsearch client is not initialized');
        }
        try {
          const document = (
            await this.esClient.get<CelProgram>(
              {
                index: this.VALIDATE_CEL_TASK_INDEX,
                id: taskInstance.id,
              },
              { meta: true }
            )
          ).body as { _id: string; _index: string; _source: CelProgram };

          if (document !== undefined && document._source !== undefined) {
            const formattedProgram = document._source.formattedProgram;
            if (formattedProgram) {
              clearInterval(interval);
              resolve(formattedProgram);
            }
          }
        } catch (e) {
          this.logger.error(
            `Error polling task ${this.VALIDATE_CEL_TASK_TYPE}, received ${e.message}`
          );
        }
      }, 1000);
    });
  };
}
