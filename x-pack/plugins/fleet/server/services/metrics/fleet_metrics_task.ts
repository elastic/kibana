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

import { uniq } from 'lodash';

import { appContextService } from '../app_context';

import type { AgentMetrics } from './fetch_agent_metrics';

export const TYPE = 'Fleet-Metrics-Task';
export const VERSION = '1.1.1';
const TITLE = 'Fleet Metrics Task';
const TIMEOUT = '1m';
const SCOPE = ['fleet'];
const INTERVAL = '1m';

export class FleetMetricsTask {
  private taskManager?: TaskManagerStartContract;
  private wasStarted: boolean = false;
  private abortController = new AbortController();
  private esClient?: ElasticsearchClient;

  constructor(
    taskManager: TaskManagerSetupContract,
    fetchAgentMetrics: (abortController: AbortController) => Promise<AgentMetrics | undefined>
  ) {
    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return withSpan({ name: TYPE, type: 'metrics' }, () =>
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
      appContextService.getLogger().debug('esClient not set, skipping Fleet metrics task');
      return;
    }
    appContextService.getLogger().debug('Running Fleet metrics task');

    try {
      const agentMetrics = await fetchAgentMetrics();
      if (!agentMetrics) {
        return;
      }
      const { agents_per_version: agentsPerVersion, agents } = agentMetrics;
      const clusterInfo = await this.esClient.info();
      const getCommonFields = (dataset: string) => {
        return {
          data_stream: {
            dataset,
            type: 'metrics',
            namespace: 'default',
          },
          agent: {
            id: appContextService.getKibanaInstanceId(),
            version: appContextService.getKibanaVersion(),
            type: 'kibana',
          },
          cluster: {
            id: clusterInfo?.cluster_uuid ?? '',
          },
        };
      };
      const agentStatusDoc = {
        '@timestamp': new Date().toISOString(),
        ...getCommonFields('fleet_server.agent_status'),
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
            upgrading_step: agentMetrics.upgrading_step,
            unhealthy_reason: agentMetrics.unhealthy_reason,
          },
        },
      };
      appContextService
        .getLogger()
        .trace('Agent status metrics: ' + JSON.stringify(agentStatusDoc));
      await this.esClient.index({
        index: 'metrics-fleet_server.agent_status-default',
        body: agentStatusDoc,
        refresh: true,
      });

      if (agentsPerVersion.length === 0) return;

      const operations = [];

      for (const byVersion of agentsPerVersion) {
        const agentVersionsDoc = {
          '@timestamp': new Date().toISOString(),
          ...getCommonFields('fleet_server.agent_versions'),
          fleet: {
            agent: {
              version: byVersion.version,
              count: byVersion.count,
            },
          },
        };
        operations.push(
          {
            create: {},
          },
          agentVersionsDoc
        );
      }

      appContextService.getLogger().trace('Agent versions metrics: ' + JSON.stringify(operations));
      const resp = await this.esClient.bulk({
        operations,
        refresh: true,
        index: 'metrics-fleet_server.agent_versions-default',
      });
      if (resp.errors) {
        const errors = uniq(
          resp.items
            .filter((item) => !!item.create?.error)
            .map((item) => item.create?.error?.reason ?? '')
        );
        throw new Error(errors.join(', '));
      }
    } catch (error) {
      appContextService.getLogger().warn('Error occurred while publishing Fleet metrics: ' + error);
    }
  };

  private get taskId() {
    return `${TYPE}:${VERSION}`;
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
        taskType: TYPE,
        schedule: {
          interval: INTERVAL,
        },
        scope: SCOPE,
        state: {},
        params: {},
      });
    } catch (e) {
      appContextService.getLogger().error(`Error scheduling task, received error: ${e}`);
    }
  }
}
