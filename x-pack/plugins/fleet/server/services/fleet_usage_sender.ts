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
import type { CoreSetup } from '@kbn/core/server';

import type { Usage } from '../collectors/register';

import { appContextService } from './app_context';

const EVENT_TYPE = 'fleet_usage';

export class FleetUsageSender {
  private taskManager?: TaskManagerStartContract;
  private taskVersion = '1.0.0';
  private taskType = 'Fleet-Usage-Sender';
  private wasStarted: boolean = false;
  private interval = '1h';

  constructor(
    taskManager: TaskManagerSetupContract,
    core: CoreSetup,
    fetchUsage: () => Promise<Usage>
  ) {
    taskManager.registerTaskDefinitions({
      [this.taskType]: {
        title: 'Fleet Usage Sender',
        timeout: '1m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, fetchUsage);
            },

            cancel: async () => {},
          };
        },
      },
    });
    this.registerTelemetryEventType(core);
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    fetchUsage: () => Promise<Usage>
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
    appContextService.getLogger().info('Running Fleet Usage telemetry send task');

    try {
      const usageData = await fetchUsage();
      appContextService.getLogger().debug(JSON.stringify(usageData));
      core.analytics.reportEvent(EVENT_TYPE, usageData);
    } catch (error) {
      appContextService
        .getLogger()
        .error('Error occurred while sending Fleet Usage telemetry: ' + error);
    }
  };

  private get taskId() {
    return `${this.taskType}-${this.taskVersion}`;
  }

  public async start(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;

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

  /**
   *  took schema from [here](https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/server/collectors/register.ts#L53) and adapted to EBT format
   */
  private registerTelemetryEventType(core: CoreSetup): void {
    core.analytics.registerEventType({
      eventType: EVENT_TYPE,
      schema: {
        agents_enabled: { type: 'boolean', _meta: { description: 'agents enabled' } },
        agents: {
          properties: {
            total_enrolled: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled agents, in any state',
              },
            },
            healthy: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled agents in a healthy state',
              },
            },
            unhealthy: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled agents in an unhealthy state',
              },
            },
            updating: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled agents in an updating state',
              },
            },
            offline: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled agents currently offline',
              },
            },
            total_all_statuses: {
              type: 'long',
              _meta: {
                description: 'The total number of agents in any state, both enrolled and inactive',
              },
            },
          },
        },
        fleet_server: {
          properties: {
            total_enrolled: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled Fleet Server agents, in any state',
              },
            },
            total_all_statuses: {
              type: 'long',
              _meta: {
                description:
                  'The total number of Fleet Server agents in any state, both enrolled and inactive.',
              },
            },
            healthy: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled Fleet Server agents in a healthy state.',
              },
            },
            unhealthy: {
              type: 'long',
              _meta: {
                description:
                  'The total number of enrolled Fleet Server agents in an unhealthy state',
              },
            },
            updating: {
              type: 'long',
              _meta: {
                description:
                  'The total number of enrolled Fleet Server agents in an updating state',
              },
            },
            offline: {
              type: 'long',
              _meta: {
                description: 'The total number of enrolled Fleet Server agents currently offline',
              },
            },
            num_host_urls: {
              type: 'long',
              _meta: {
                description: 'The number of Fleet Server hosts configured in Fleet settings.',
              },
            },
          },
        },
        packages: {
          type: 'array',
          items: {
            properties: {
              name: { type: 'keyword' },
              version: { type: 'keyword' },
              enabled: { type: 'boolean' },
            },
          },
        },
        agent_versions: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: { description: 'The agent versions enrolled in this deployment.' },
          },
        },
        fleet_server_config: {
          properties: {
            hosts: {
              type: 'array',
              items: {
                properties: {
                  id: { type: 'keyword' },
                  name: { type: 'keyword' },
                  host_urls: {
                    type: 'array',
                    items: {
                      type: 'keyword',
                    },
                  },
                  is_default: { type: 'boolean' },
                  is_preconfigured: { type: 'boolean' },
                  proxy_id: { type: 'keyword' },
                },
              },
            },
            policies: {
              type: 'array',
              items: {
                properties: {
                  id: { type: 'keyword' },
                  name: { type: 'keyword' },
                  enabled: { type: 'boolean' },
                  policy_id: { type: 'keyword' },
                  input_config: { type: 'pass_through' },
                },
              },
            },
          },
        },
      },
    });
  }
}
