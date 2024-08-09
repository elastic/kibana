/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import type { FleetUsage } from '../../collectors/register';

import { appContextService } from '../app_context';

import {
  fleetAgentsSchema,
  fleetUsagesSchema,
  fleetIntegrationsSchema,
} from './fleet_usages_schema';

const FLEET_USAGES_EVENT_TYPE = 'fleet_usage';
const FLEET_AGENTS_EVENT_TYPE = 'fleet_agents';
const FLEET_INTEGRATIONS_EVENT_TYPE = 'fleet_integrations';

export class FleetUsageSender {
  private taskManager?: TaskManagerStartContract;
  private taskVersion = '1.1.7';
  private taskType = 'Fleet-Usage-Sender';
  private wasStarted: boolean = false;
  private interval = '1h';
  private timeout = '1m';
  private abortController = new AbortController();

  constructor(
    taskManager: TaskManagerSetupContract,
    core: CoreSetup,
    fetchUsage: (abortController: AbortController) => Promise<FleetUsage | undefined>
  ) {
    taskManager.registerTaskDefinitions({
      [this.taskType]: {
        title: 'Fleet Usage Sender',
        timeout: this.timeout,
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return withSpan({ name: this.taskType, type: 'telemetry' }, () =>
                this.runTask(taskInstance, core, () => fetchUsage(this.abortController))
              );
            },

            cancel: async () => {
              this.abortController.abort('task timed out');
            },
          };
        },
      },
    });
    this.registerTelemetryEventType(core);
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    fetchUsage: () => Promise<FleetUsage | undefined>
  ) => {
    if (!this.wasStarted) {
      appContextService.getLogger().debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      appContextService
        .getLogger()
        .info(
          `Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
        );
      return getDeleteTaskRunResult();
    }
    appContextService.getLogger().info('Running Fleet Usage telemetry send task');

    try {
      const usageData = await fetchUsage();
      if (!usageData) {
        return;
      }
      const {
        agents_per_version: agentsPerVersion,
        agents_per_output_type: agentsPerOutputType,
        agents_per_privileges: agentsPerPrivileges,
        upgrade_details: upgradeDetails,
        integrations_details: integrationsDetails,
        ...fleetUsageData
      } = usageData;
      appContextService
        .getLogger()
        .debug(() => 'Fleet usage telemetry: ' + JSON.stringify(fleetUsageData));

      core.analytics.reportEvent(FLEET_USAGES_EVENT_TYPE, fleetUsageData);

      appContextService
        .getLogger()
        .debug(() => 'Agents per privileges telemetry: ' + JSON.stringify(agentsPerPrivileges));
      core.analytics.reportEvent(FLEET_AGENTS_EVENT_TYPE, {
        agents_per_privileges: agentsPerPrivileges,
      });

      appContextService
        .getLogger()
        .debug(() => 'Agents per version telemetry: ' + JSON.stringify(agentsPerVersion));
      agentsPerVersion.forEach((byVersion) => {
        core.analytics.reportEvent(FLEET_AGENTS_EVENT_TYPE, { agents_per_version: byVersion });
      });

      appContextService
        .getLogger()
        .debug(() => 'Agents per output type telemetry: ' + JSON.stringify(agentsPerOutputType));
      agentsPerOutputType.forEach((byOutputType) => {
        core.analytics.reportEvent(FLEET_AGENTS_EVENT_TYPE, {
          agents_per_output_type: byOutputType,
        });
      });

      appContextService
        .getLogger()
        .debug(() => 'Agents upgrade details telemetry: ' + JSON.stringify(upgradeDetails));
      upgradeDetails.forEach((upgradeDetailsObj) => {
        core.analytics.reportEvent(FLEET_AGENTS_EVENT_TYPE, { upgrade_details: upgradeDetailsObj });
      });

      appContextService
        .getLogger()
        .debug(() => 'Integrations details telemetry: ' + JSON.stringify(integrationsDetails));
      integrationsDetails.forEach((integrationDetailsObj) => {
        core.analytics.reportEvent(FLEET_INTEGRATIONS_EVENT_TYPE, {
          integrations_details: integrationDetailsObj,
        });
      });
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
      appContextService
        .getLogger()
        .info(`Task ${this.taskId} scheduled with interval ${this.interval}`);

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
      eventType: FLEET_USAGES_EVENT_TYPE,
      schema: fleetUsagesSchema,
    });

    core.analytics.registerEventType({
      eventType: FLEET_AGENTS_EVENT_TYPE,
      schema: fleetAgentsSchema,
    });

    core.analytics.registerEventType({
      eventType: FLEET_INTEGRATIONS_EVENT_TYPE,
      schema: fleetIntegrationsSchema,
    });
  }
}
