/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import { appContextService } from '../app_context';

import type { AgentMetrics } from './fetch_agent_metrics';

export class FleetMetricsTask {
  private taskManager?: TaskManagerStartContract;
  private taskVersion = '0.0.5';
  private taskType = 'Fleet-Metrics-Task';
  private wasStarted: boolean = false;
  private interval = '1m';
  private timeout = '1m';
  private abortController = new AbortController();
  private esClient?: ElasticsearchClient;

  constructor(
    taskManager: TaskManagerSetupContract,
    fetchAgentMetrics: (abortController: AbortController) => Promise<AgentMetrics | undefined>
  ) {
    taskManager.registerTaskDefinitions({
      [this.taskType]: {
        title: 'Fleet Metrics Task',
        timeout: this.timeout,
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return withSpan({ name: this.taskType, type: 'metrics' }, () =>
                this.runTask(taskInstance, () => fetchAgentMetrics(this.abortController))
              );
            },

            cancel: async () => {
              this.abortController.abort('task timed out');
            },
          };
        },
      },
    });
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    fetchAgentMetrics: () => Promise<AgentMetrics | undefined>
  ) => {
    if (!this.wasStarted) {
      appContextService.getLogger().debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      throwUnrecoverableError(new Error('Outdated task version for task: ' + taskInstance.id));
      return;
    }
    if (!this.esClient) {
      appContextService.getLogger().info('esClient not set, skipping Fleet metrics task');
      return;
    }
    appContextService.getLogger().info('Running Fleet metrics task');

    try {
      const agentMetrics = await fetchAgentMetrics();
      if (!agentMetrics) {
        return;
      }
      const { agents_per_version: agentsPerVersion, agents } = agentMetrics;
      const agentStatusDoc = {
        '@timestamp': new Date().toISOString(),
        fleet: {
          agents: {
            total: agents.total_all_statuses,
            enrolled: agents.total_enrolled,
            unenrolled: agents.unenrolled,
            healthy: agents.healthy,
            offline: agents.offline,
            updating: agents.updating,
            unhealthy: agents.unhealthy,
            inactive: agents.inactive,
            unhealthy_reason: agentMetrics.unhealthy_reason,
            upgrading_step: agentMetrics.upgrading_step,
          },
        },
      };
      appContextService
        .getLogger()
        .debug('Agent status metrics: ' + JSON.stringify(agentStatusDoc));
      // this.esClient?.create({
      //   index: 'metrics-fleet_server.agent_status-default',
      //   id: uuidv4(),
      //   body: agentStatusDoc,
      // });

      appContextService
        .getLogger()
        .debug('Agent versions metrics: ' + JSON.stringify(agentsPerVersion));
      // agentsPerVersion.forEach((byVersion) => {
      //   this.esClient?.create({
      //     index: 'metrics-fleet_server.agent_versions-default',
      //     id: uuidv4(),
      //     body: {
      //       '@timestamp': new Date().toISOString(),
      //       fleet: {
      //         agent: {
      //           version: byVersion.version,
      //           count: byVersion.count,
      //         },
      //       },
      //     },
      //   });
      // });
    } catch (error) {
      appContextService
        .getLogger()
        .error('Error occurred while publishing Fleet metrics: ' + error);
    }
  };

  private get taskId() {
    return `${this.taskType}-${this.taskVersion}`;
  }

  public async start(taskManager: TaskManagerStartContract, esClient: ElasticsearchClient) {
    this.taskManager = taskManager;
    this.esClient = esClient;

    if (!taskManager) {
      appContextService.getLogger().error('missing required service during start');
      return;
    }

    this.wasStarted = true;

    try {
      appContextService.getLogger().info(`Task ${this.taskId} scheduled with interval 1h`);

      await this.taskManager.ensureScheduled({
        id: this.taskId,
        taskType: this.taskType,
        schedule: {
          interval: this.interval,
        },
        scope: ['fleet'],
        state: {},
        params: {},
      });
    } catch (e) {
      appContextService.getLogger().error(`Error scheduling task, received error: ${e}`);
    }
  }
}
