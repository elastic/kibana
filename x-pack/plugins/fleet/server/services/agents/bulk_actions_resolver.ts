/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClient } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';

import { appContextService } from '../app_context';

import { ReassignActionRunner } from './reassign_action_runner';
import { UnenrollActionRunner } from './unenroll_action_runner';
import { UpgradeActionRunner } from './upgrade_action_runner';
import { UpdateAgentTagsActionRunner } from './update_agent_tags_action_runner';

export enum BulkActionTaskType {
  REASSIGN_RETRY = 'fleet:reassign_action:retry',
  UNENROLL_RETRY = 'fleet:unenroll_action:retry',
  UPGRADE_RETRY = 'fleet:upgrade_action:retry',
  UPDATE_AGENT_TAGS_RETRY = 'fleet:update_agent_tags:retry',
}

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

      switch (taskType) {
        case BulkActionTaskType.REASSIGN_RETRY:
          return createRetryTask(
            taskInstance,
            getDeps,
            async (esClient: ElasticsearchClient, soClient: SavedObjectsClient, options: any) =>
              await new ReassignActionRunner(
                esClient,
                soClient,
                options.newAgentPolicyId
              ).runActionAsyncWithRetry(options)
          );
        case BulkActionTaskType.UNENROLL_RETRY:
          return createRetryTask(
            taskInstance,
            getDeps,
            async (esClient: ElasticsearchClient, soClient: SavedObjectsClient, options: any) =>
              await new UnenrollActionRunner(esClient, soClient).runActionAsyncWithRetry(options)
          );
        case BulkActionTaskType.UPGRADE_RETRY:
          return createRetryTask(
            taskInstance,
            getDeps,
            async (esClient: ElasticsearchClient, soClient: SavedObjectsClient, options: any) =>
              await new UpgradeActionRunner(esClient, soClient, options).runActionAsyncWithRetry(
                options
              )
          );
        case BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY:
          return createRetryTask(
            taskInstance,
            getDeps,
            async (esClient: ElasticsearchClient, soClient: SavedObjectsClient, options: any) =>
              await new UpdateAgentTagsActionRunner(
                esClient,
                soClient,
                options.tagsToAdd,
                options.tagsToRemove
              ).runActionAsyncWithRetry(options)
          );
        default:
          throw new Error('Unknown task type: ' + taskType);
      }
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

  getTaskId(actionId: string, type: string) {
    return `${type}:${actionId}`;
  }

  public async run(
    options: {
      kuery: string;
      showInactive?: boolean;
      batchSize?: number;
      pitId: string;
      actionId: string;
      searchAfter?: SortResults;
      retryCount: number;
    },
    taskType: string,
    runAt?: Date
  ) {
    const taskId = this.getTaskId(options.actionId, taskType);
    await this.taskManager?.ensureScheduled({
      id: taskId,
      taskType,
      scope: ['fleet'],
      state: {},
      params: { options },
      runAt: runAt ?? moment(new Date()).add(1, 's').toDate(),
    });
    appContextService.getLogger().info('Running task ' + taskId);
    return taskId;
  }
}

export function createRetryTask(
  taskInstance: ConcreteTaskInstance,
  getDeps: () => Promise<{ esClient: ElasticsearchClient; soClient: SavedObjectsClient }>,
  doRetry: (esClient: ElasticsearchClient, soClient: SavedObjectsClient, options: any) => void
) {
  return {
    async run() {
      appContextService.getLogger().info('Running bulk action retry task');

      const { esClient, soClient } = await getDeps();

      const options = taskInstance.params.options;

      appContextService
        .getLogger()
        .debug(`Retry #${options.retryCount} of task ${taskInstance.id}`);

      if (options.searchAfter) {
        appContextService.getLogger().info('Continuing task from batch ' + options.searchAfter);
      }

      doRetry(esClient, soClient, {
        ...options,
        taskId: taskInstance.id,
      });

      appContextService.getLogger().info('Completed bulk action retry task');
    },

    async cancel() {
      // appContextService.getLogger().debug('Cancel bulk action retry task');
    },
  };
}
