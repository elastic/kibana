/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';

import type { EndpointAppContext } from '../../types';
import {
  fileIdsWithoutChunks,
  getFilesByStatus,
  updateFilesStatus,
} from '../../services/actions/action_files';

export const TYPE = 'endpoint:check-deleted-files-task';
export const VERSION = '1.0.0';
const TITLE = 'Security Solution Endpoint Deleted Files Periodic Tasks';
const TIMEOUT = '2m';
const SCOPE = ['securitySolution'];
const INTERVAL = '5m';

export interface CheckDeletedFilesTaskSetupContract {
  endpointAppContext: EndpointAppContext;
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
}

export interface CheckDeletedFilesTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class CheckDeletedFilesTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: CheckDeletedFilesTaskSetupContract) {
    const { endpointAppContext, core, taskManager } = setupContract;
    this.logger = endpointAppContext.logFactory.get(this.getTaskId());

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: CheckDeletedFilesTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('missing required service during start');
      return;
    }

    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TYPE}:${VERSION}`;
  };

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.getTaskId()) {
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    const readyFiles = await getFilesByStatus(esClient);
    if (!readyFiles?.hits?.hits.length) return;

    const deletedFileIds = await fileIdsWithoutChunks(
      esClient,
      readyFiles.hits.hits.map((hit) => hit._id)
    );
    if (!deletedFileIds.length) return;

    this.logger.info(`Attempting to update ${deletedFileIds.length} files to DELETED status`);
    const updatedFiles = await updateFilesStatus(esClient, deletedFileIds, 'DELETED');
    if (updatedFiles?.failures?.length) {
      this.logger.warn(`Failed to update ${updatedFiles.failures.length} files to DELETED status`);
    }
  };
}
