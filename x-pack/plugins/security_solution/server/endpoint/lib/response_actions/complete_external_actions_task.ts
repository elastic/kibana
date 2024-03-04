/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/logging';
import { CompleteExternalActionsTaskRunner } from './complete_external_actions_task_runner';
import type { EndpointAppContext } from '../../types';

const COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE = 'endpoint:complete-external-response-actions';

export interface CompleteExternalResponseActionsTaskConstructorOptions {
  endpointAppContext: EndpointAppContext;
}

export interface CompleteExternalResponseActionsTaskSetupOptions {
  taskManager: TaskManagerSetupContract;
}

export interface CompleteExternalResponseActionsTaskStartOptions {
  taskManager: TaskManagerStartContract;
}

export class CompleteExternalResponseActionsTask {
  private wasSetup = false;
  private wasStarted = false;
  private log: Logger;
  private cleanup: (() => void | Promise<void>) | undefined;

  constructor(protected readonly options: CompleteExternalResponseActionsTaskConstructorOptions) {
    this.log = this.options.endpointAppContext.service.createLogger(
      COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE
    );
  }

  public async setup({ taskManager }: CompleteExternalResponseActionsTaskSetupOptions) {
    if (this.wasSetup) {
      throw new Error(`Task has already been setup!`);
    }

    this.wasSetup = true;

    const taskInterval =
      this.options.endpointAppContext.serverConfig.completeExternalResponseActionsTaskInterval;
    const taskTimeout =
      this.options.endpointAppContext.serverConfig.completeExternalResponseActionsTaskTimeout;

    this.log.info(
      `Registering task [${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE}] with timeout of [${taskTimeout}] and run interval of [${taskInterval}]`
    );

    taskManager.registerTaskDefinitions({
      [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
        title: 'Security Solution Complete External Response Actions',
        timeout: taskTimeout,
        createTaskRunner: () => {
          return new CompleteExternalActionsTaskRunner(
            this.options.endpointAppContext.service,
            taskInterval
          );
        },
      },
    });
  }

  public async start({ taskManager }: CompleteExternalResponseActionsTaskStartOptions) {
    if (this.wasStarted) {
      throw new Error('Task has already been started!');
    }

    this.wasStarted = true;

    // TODO:PT start task

    this.cleanup = () => {
      this.log.info(
        `Removing task definition [${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE}] (if it exists)`
      );
      taskManager.removeIfExists(COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE);
    };
  }

  public async stop() {
    this.wasSetup = false;
    this.wasStarted = false;

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
  }
}
