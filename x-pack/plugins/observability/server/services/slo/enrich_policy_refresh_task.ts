/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SLO_SUMMARY_ENRICH_POLICY_NAME } from '../../assets/constants';
import { SO_SLO_TYPE } from '../../saved_objects';

export const TASK_TYPE = 'SLO-Enrich-Policy-Refresh';

export class EnrishPolicyRefreshTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private soClient?: SavedObjectsClient;
  private esClient?: ElasticsearchClient;

  constructor(taskManager: TaskManagerSetupContract, logger: Logger) {
    this.logger = logger;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'SLO Enrish Policy Refresh',
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              const runAt = new Date().toISOString();
              const lastRunAt = taskInstance.state?.lastRunAt || runAt;
              if (!this.soClient) {
                this.logger.debug('[SLO] soClient undefined, skipping task.');
                return { state: { lastRunAt } };
              }

              if (!this.esClient) {
                this.logger.debug('[SLO] esClient undefined, skipping task.');
                return { state: { lastRunAt } };
              }

              const response = await this.soClient.find({
                type: SO_SLO_TYPE,
                filter: `slo.updated_at > "${lastRunAt}"`,
                perPage: 1,
              });
              const shouldExecutePolicy = response.total > 0;

              if (shouldExecutePolicy) {
                this.logger.info(
                  `[SLO] ${response.total} updated SLOs found since [${lastRunAt}]. Executing enrich policy.`
                );

                try {
                  await this.esClient.enrich.executePolicy({
                    name: SLO_SUMMARY_ENRICH_POLICY_NAME,
                  });
                } catch (err) {
                  if (err?.meta?.body?.error?.type === 'es_rejected_execution_exception') {
                    this.logger.info(
                      `[SLO] Enrich policy [${SLO_SUMMARY_ENRICH_POLICY_NAME}] already executing.`
                    );
                    return { state: { lastRunAt } };
                  }

                  this.logger.info('[SLO] Cannot execute enrich policy. Will retry in next run.');
                  return { state: { lastRunAt } };
                }
              }

              return { state: { lastRunAt: runAt } };
            },

            cancel: async () => {
              this.abortController.abort('[SLO] Enrish Policy Refresh Task timed out');
            },
          };
        },
      },
    });
  }

  private get taskId() {
    return `${TASK_TYPE}:1.0.0`;
  }

  public async start(
    taskManager: TaskManagerStartContract,
    soClient: SavedObjectsClient,
    esClient: ElasticsearchClient
  ) {
    this.taskManager = taskManager;
    this.soClient = soClient;
    this.esClient = esClient;

    if (!taskManager) {
      this.logger.info('[SLO] Missing required service during Enrish Policy Refresh Task start');
    }

    this.taskManager.ensureScheduled({
      id: this.taskId,
      taskType: TASK_TYPE,
      schedule: {
        interval: '1m',
      },
      scope: ['observability', 'slo'],
      state: {},
      params: {},
    });
  }
}
