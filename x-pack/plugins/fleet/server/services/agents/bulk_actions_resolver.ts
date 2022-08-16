/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';

import { appContextService } from '../app_context';

import { reassignRetryTask } from './reassign_retry_task';

export enum BulkActionTaskType {
  REASSIGN_RETRY = 'fleet:reassign_action:retry',
}

export class BulkActionsResolver {
  private taskManager?: TaskManagerStartContract;

  reassignTaskRunner(core: CoreSetup) {
    return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
      const getDeps = async () => {
        const [coreStart] = await core.getStartServices();
        return {
          esClient: coreStart.elasticsearch.client.asInternalUser,
          soClient: new SavedObjectsClient(coreStart.savedObjects.createInternalRepository()),
        };
      };

      return reassignRetryTask(taskInstance, getDeps);
    };
  }

  constructor(taskManager: TaskManagerSetupContract, core: CoreSetup) {
    taskManager.registerTaskDefinitions({
      [BulkActionTaskType.REASSIGN_RETRY]: {
        title: 'Bulk Reassign Retry',
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: this.reassignTaskRunner(core),
      },
    });
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
      newAgentPolicyId: string;
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
