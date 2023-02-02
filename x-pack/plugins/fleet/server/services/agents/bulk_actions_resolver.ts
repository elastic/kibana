/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClient } from '@kbn/core/server';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';

import { appContextService } from '../app_context';

import { ReassignActionRunner } from './reassign_action_runner';
import { UpgradeActionRunner } from './upgrade_action_runner';
import { UpdateAgentTagsActionRunner } from './update_agent_tags_action_runner';
import { UnenrollActionRunner } from './unenroll_action_runner';
import type { ActionParams } from './action_runner';
import { RequestDiagnosticsActionRunner } from './request_diagnostics_action_runner';
import type { RetryParams } from './retry_helper';
import { getRetryParams } from './retry_helper';
import { BulkActionTaskType } from './bulk_action_types';

/**
 * Create and run retry tasks of agent bulk actions
 */
export class BulkActionsResolver {
  private taskManager?: TaskManagerStartContract;

  createTaskRunner(core: CoreSetup, taskType: BulkActionTaskType) {
    return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
      const getDeps = async () => {
        const [coreStart] = await core.getStartServices();
        return {
          esClient: coreStart.elasticsearch.client.asInternalUser,
          soClient: new SavedObjectsClient(coreStart.savedObjects.createInternalRepository()),
        };
      };

      const runnerMap = {
        [BulkActionTaskType.UNENROLL_RETRY]: UnenrollActionRunner,
        [BulkActionTaskType.REASSIGN_RETRY]: ReassignActionRunner,
        [BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY]: UpdateAgentTagsActionRunner,
        [BulkActionTaskType.UPGRADE_RETRY]: UpgradeActionRunner,
        [BulkActionTaskType.REQUEST_DIAGNOSTICS_RETRY]: RequestDiagnosticsActionRunner,
      };

      return createRetryTask(
        taskInstance,
        getDeps,
        async (
          esClient: ElasticsearchClient,
          soClient: SavedObjectsClient,
          actionParams: ActionParams,
          retryParams: RetryParams
        ) =>
          await new runnerMap[taskType](
            esClient,
            soClient,
            actionParams,
            retryParams
          ).runActionAsyncWithRetry()
      );
    };
  }

  constructor(taskManager: TaskManagerSetupContract, core: CoreSetup) {
    const definitions = Object.values(BulkActionTaskType)
      .map((type) => {
        return [
          type,
          {
            title: 'Bulk Action Retry',
            timeout: '1m',
            maxAttempts: 1,
            createTaskRunner: this.createTaskRunner(core, type),
          },
        ];
      })
      .reduce((acc, current) => {
        acc[current[0] as string] = current[1];
        return acc;
      }, {} as any);
    taskManager.registerTaskDefinitions(definitions);
  }

  public async start(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;
  }

  public getTaskId(actionId: string, type: string) {
    return `${type}:${actionId}`;
  }

  public async run(
    actionParams: ActionParams,
    retryParams: RetryParams,
    taskType: string,
    taskId: string,
    runAt?: Date
  ) {
    await this.taskManager?.ensureScheduled({
      id: taskId,
      taskType,
      scope: ['fleet'],
      state: {},
      params: { actionParams, retryParams },
      runAt: runAt ?? moment(new Date()).add(3, 's').toDate(),
    });
    appContextService.getLogger().info('Scheduling task ' + taskId);
    return taskId;
  }

  public async removeIfExists(taskId: string) {
    appContextService.getLogger().info('Removing task ' + taskId);
    await this.taskManager?.removeIfExists(taskId);
  }
}

export function createRetryTask(
  taskInstance: ConcreteTaskInstance,
  getDeps: () => Promise<{ esClient: ElasticsearchClient; soClient: SavedObjectsClient }>,
  doRetry: (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClient,
    actionParams: ActionParams,
    retryParams: RetryParams
  ) => void
) {
  return {
    async run() {
      appContextService.getLogger().info('Running bulk action retry task');

      const { esClient, soClient } = await getDeps();

      const retryParams: RetryParams = getRetryParams(
        taskInstance.taskType,
        taskInstance.params.retryParams
      );

      appContextService
        .getLogger()
        .debug(`Retry #${retryParams.retryCount} of task ${taskInstance.id}`);

      if (retryParams.searchAfter) {
        appContextService.getLogger().info('Continuing task from batch ' + retryParams.searchAfter);
      }

      doRetry(esClient, soClient, taskInstance.params.actionParams, {
        ...retryParams,
        taskId: taskInstance.id,
      });

      appContextService.getLogger().info('Completed bulk action retry task');
    },

    async cancel() {},
  };
}
