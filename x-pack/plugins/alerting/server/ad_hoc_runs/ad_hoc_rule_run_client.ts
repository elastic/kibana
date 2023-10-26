/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreStart,
  ISavedObjectsRepository,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { ScheduleAdHocRuleRunOptions } from '../application/rule/methods/ad_hoc_runs/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { AlertingPluginsStart } from '../plugin';
import { TaskRunnerFactory } from '../task_runner';
import { AdHocRuleRunParams } from '../types';

interface ConstructorOpts {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  taskRunnerFactory: TaskRunnerFactory;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
}

interface BulkQueueOpts {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  rules: RuleDomain[];
  spaceId: string;
  options: ScheduleAdHocRuleRunOptions;
}

export class AdHocRuleRunClient {
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private savedObjectsRepository?: ISavedObjectsRepository;
  private coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  private readonly checkerTaskType = 'Ad-Hoc-Rule-Run-Check';
  private readonly adHocRuleRunTaskType = 'Ad-Hoc-Rule-Run';
  private readonly checkerTaskTimeout = '1m';
  private readonly checkerTaskInterval = '1m';

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.coreStartServices = opts.coreStartServices;

    // Register the task that checks if there are any ad hoc rule
    // runs in the queue and schedules the run if there are
    opts.taskManager.registerTaskDefinitions({
      [this.checkerTaskType]: {
        title: 'Alerting Ad Hoc Rule Run Check',
        timeout: this.checkerTaskTimeout,
        createTaskRunner: () => {
          return {
            run: async () => this.runCheckTask(),
          };
        },
      },
    });

    // Registers the task that handles the ad hoc rule run
    opts.taskManager.registerTaskDefinitions({
      [this.adHocRuleRunTaskType]: {
        title: 'Alerting Ad Hoc Rule Run',
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  public async startCheck(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;

    try {
      await taskManager.ensureScheduled({
        id: this.checkerTaskType,
        taskType: this.checkerTaskType,
        schedule: {
          interval: this.checkerTaskInterval,
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.error(`Error scheduling ${this.checkerTaskType}, received ${e.message}`);
    }
  }

  public async bulkQueue({ unsecuredSavedObjectsClient, rules, spaceId, options }: BulkQueueOpts) {
    const bulkResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRuleRunParams>(
      rules.map((rule: RuleDomain) => ({
        type: 'ad_hoc_rule_run_params',
        attributes: {
          createdAt: new Date().toISOString(),
          spaceId,
          ruleId: rule.id,
          rule: {
            id: rule.id,
            name: rule.name,
            tags: rule.tags,
            alertTypeId: rule.alertTypeId,
            params: rule.params,
            apiKeyOwner: rule.apiKeyOwner,
            apiKeyCreatedByUser: rule.apiKeyCreatedByUser,
            consumer: rule.consumer,
            enabled: rule.enabled,
            schedule: rule.schedule,
            createdBy: rule.createdBy,
            updatedBy: rule.updatedBy,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
            throttle: rule.throttle,
            notifyWhen: rule.notifyWhen,
            muteAll: rule.muteAll,
            revision: rule.revision,
            snoozeSchedule: rule.snoozeSchedule,
          },
          apiKeyToUse: rule.apiKey!,
          enabled: true,
          intervalStart: options.intervalStart,
          intervalDuration: options.intervalDuration,
          ...(options.intervalEnd ? { intervalEnd: options.intervalEnd } : {}),
        },
      }))
    );

    this.logger.info(`queue ${JSON.stringify(bulkResponse)}`);
    // TODO retry errors
    return bulkResponse.saved_objects.map((so, index) => ({
      ruleId: rules[index].id,
      adHocRunId: so.error ? null : so.id,
    }));
  }

  private async getSavedObjectsRepository(): Promise<ISavedObjectsRepository> {
    if (this.savedObjectsRepository) {
      return this.savedObjectsRepository;
    }

    const [coreStart] = await this.coreStartServices;
    this.savedObjectsRepository = coreStart.savedObjects.createInternalRepository([
      'ad_hoc_rule_run_params',
    ]);
    return this.savedObjectsRepository;
  }

  private runCheckTask = async () => {
    this.logger.info(`Running ad hoc rule run check task`);
    try {
      // Ensure no ad hoc task is currently running
      try {
        this.logger.info(`Trying to get task with ID ${this.adHocRuleRunTaskType}`);
        await this.taskManager?.get(this.adHocRuleRunTaskType);
        this.logger.info(`Found existing task, not scheduling another`);
        // found an ad hoc rule run task, don't schedule another one
        return;
      } catch (err) {
        this.logger.info(`No current ad hoc rule run task found - proceeding`);
        // no ad hoc rule run task found, proceed
      }

      // Check if there are any ad hoc rule runs queued up
      const savedObjectsRepository = await this.getSavedObjectsRepository();
      const findResponse = await savedObjectsRepository.find<AdHocRuleRunParams>({
        type: 'ad_hoc_rule_run_params',
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 1,
      });
      this.logger.info(
        `Find result for ad_hoc_rule_run_params SO: ${JSON.stringify(findResponse)}`
      );

      if (findResponse.saved_objects.length > 0) {
        const adHocRun = findResponse.saved_objects[0];

        this.logger.info(
          `Scheduling task ${JSON.stringify({
            id: this.adHocRuleRunTaskType,
            taskType: this.adHocRuleRunTaskType,
            state: {},
            params: {
              adHocRuleRunParamsId: adHocRun.id,
              spaceId: adHocRun.attributes.spaceId,
            },
          })}`
        );
        // Schedule the ad hoc rule run
        await this.taskManager?.schedule({
          id: this.adHocRuleRunTaskType,
          taskType: this.adHocRuleRunTaskType,
          state: {},
          params: {
            adHocRuleRunParamsId: adHocRun.id,
            spaceId: adHocRun.attributes.spaceId,
          },
        });
      } else {
        this.logger.info(`No ad hoc rule runs queued`);
      }
    } catch (error) {
      this.logger.warn(`Error running ad hoc rule run check task: ${error}`);
    }
  };
}
