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
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import {
  fileIdsWithoutChunksByIndex,
  getFilesByStatus,
  updateFilesStatus,
} from '../services/files';

export const TYPE = 'fleet:check-deleted-files-task';
export const VERSION = '1.0.1';
const TITLE = 'Fleet Deleted Files Periodic Tasks';
const TIMEOUT = '2m';
const SCOPE = ['fleet'];
const INTERVAL = '1d';

interface CheckDeletedFilesTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface CheckDeletedFilesTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class CheckDeletedFilesTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();

  constructor(setupContract: CheckDeletedFilesTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort('task timed out');
            },
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
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received error: ${e}`);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    try {
      const readyFiles = await getFilesByStatus(esClient, this.abortController);
      if (!readyFiles.length) return;

      const { fileIdsByIndex: deletedFileIdsByIndex, allFileIds: allDeletedFileIds } =
        await fileIdsWithoutChunksByIndex(esClient, this.abortController, readyFiles);
      if (!allDeletedFileIds.size) return;

      this.logger.info(`Attempting to update ${allDeletedFileIds.size} files to DELETED status`);
      this.logger.debug(`Attempting to file ids: ${deletedFileIdsByIndex}`);
      const updatedFilesResponses = await updateFilesStatus(
        esClient,
        this.abortController,
        deletedFileIdsByIndex,
        'DELETED'
      );
      const failures = updatedFilesResponses.flatMap(
        (updatedFilesResponse) => updatedFilesResponse.failures
      );
      if (failures?.length) {
        this.logger.warn(`Failed to update ${failures.length} files to DELETED status`);
        this.logger.debug(`Failed to update files to DELETED status: ${failures}`);
      }
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`request aborted due to timeout: ${err}`);
        return;
      }
      this.logger.error(err);
    }
  };
}
