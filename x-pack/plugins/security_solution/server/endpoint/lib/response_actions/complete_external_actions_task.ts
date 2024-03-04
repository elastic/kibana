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

  constructor(protected readonly options: CompleteExternalResponseActionsTaskConstructorOptions) {}

  public async setup({ taskManager }: CompleteExternalResponseActionsTaskSetupOptions) {
    if (this.wasSetup) {
      throw new Error(`Task has already been setup!`);
    }

    this.wasSetup = true;

    taskManager.registerTaskDefinitions({
      [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
        title: 'Security Solution Complete External Response Actions',
        timeout: '5m', // FIXME:PT introduce server config property
        createTaskRunner: () => {
          // FIXME:PT add timeout to class call below
          return new CompleteExternalActionsTaskRunner(this.options.endpointAppContext.service);
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
  }

  public async stop() {
    this.wasSetup = false;
    this.wasStarted = false;

    // TODO:PT remove task registration?
    // taskManager.removeIfExists();
  }
}
