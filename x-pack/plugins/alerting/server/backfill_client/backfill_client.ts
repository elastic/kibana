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
import type {
  ScheduleBackfillOptions,
  ScheduleBackfillResults,
} from '../application/rule/methods/backfill/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { AlertingPluginsStart } from '../plugin';
import { TaskRunnerFactory } from '../task_runner';
import { AdHocRuleRunParams } from '../types';

const BACKFILL_CONCURRENCY = 1;

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
  options: ScheduleBackfillOptions;
}

export class BackfillClient {
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private savedObjectsRepository?: ISavedObjectsRepository;
  private coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  private readonly checkerTaskType = 'Backfill-Check';
  private readonly backfillTaskType = 'Backfill';
  private readonly checkerTaskTimeout = '1m';
  private readonly checkerTaskInterval = '1m';

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.coreStartServices = opts.coreStartServices;

    // Register the task that checks if there are any backfills
    // in the queue and schedules the run if there are
    opts.taskManager.registerTaskDefinitions({
      [this.checkerTaskType]: {
        title: 'Alerting Backfill Check',
        timeout: this.checkerTaskTimeout,
        createTaskRunner: () => ({
          run: async () => this.runCheckTask(),
        }),
      },
    });

    // Registers the task that handles the backfill using the ad hoc task runner
    opts.taskManager.registerTaskDefinitions({
      [this.backfillTaskType]: {
        title: 'Alerting Backfill',
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

  public async bulkQueue({
    unsecuredSavedObjectsClient,
    rules,
    spaceId,
    options,
  }: BulkQueueOpts): Promise<ScheduleBackfillResults> {
    const bulkResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRuleRunParams>(
      rules.map((rule: RuleDomain) => ({
        type: 'backfill_params',
        attributes: {
          apiKeyId: Buffer.from(rule.apiKey!, 'base64').toString().split(':')[0],
          apiKeyToUse: rule.apiKey!,
          createdAt: new Date().toISOString(),
          currentStart: options.start,
          duration: rule.schedule.interval,
          enabled: true,
          ...(options.end ? { end: options.end } : {}),
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
            revision: rule.revision,
          },
          spaceId,
          start: options.start,
          status: 'Pending',
        },
      }))
    );

    this.logger.info(`queue response ${JSON.stringify(bulkResponse)}`);
    // TODO retry errors
    return bulkResponse.saved_objects.map((so, index) => ({
      ruleId: rules[index].id,
      backfillId: so.error ? null : so.id,
    }));
  }

  private async getSavedObjectsRepository(): Promise<ISavedObjectsRepository> {
    if (this.savedObjectsRepository) {
      return this.savedObjectsRepository;
    }

    const [coreStart] = await this.coreStartServices;
    this.savedObjectsRepository = coreStart.savedObjects.createInternalRepository([
      'backfill_params',
    ]);
    return this.savedObjectsRepository;
  }

  private runCheckTask = async () => {
    this.logger.info(`Running backfill check task`);
    try {
      // Ensure no backfill task is currently running
      try {
        this.logger.info(`Trying to get task with ID ${this.backfillTaskType}`);
        await this.taskManager?.get(this.backfillTaskType);
        this.logger.info(`Found existing task, not scheduling another`);
        // found a backfill task, don't schedule another one
        return;
      } catch (err) {
        this.logger.info(`No current backfill task found - proceeding`);
        // no backfill task found, proceed
      }

      // Check if there are any ad hoc rule runs queued up
      const savedObjectsRepository = await this.getSavedObjectsRepository();
      const findResponse = await savedObjectsRepository.find<AdHocRuleRunParams>({
        type: 'backfill_params',
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 1,
      });
      this.logger.info(`Find result for backfill_params SO: ${JSON.stringify(findResponse)}`);

      if (findResponse.saved_objects.length > 0) {
        const backfillRun = findResponse.saved_objects[0];

        this.logger.info(
          `Scheduling task ${JSON.stringify({
            id: this.backfillTaskType,
            taskType: this.backfillTaskType,
            state: {},
            params: {
              adHocRuleRunParamsId: backfillRun.id,
              spaceId: backfillRun.attributes.spaceId,
            },
          })}`
        );
        // Schedule the backfill
        await this.taskManager?.schedule({
          id: this.backfillTaskType,
          taskType: this.backfillTaskType,
          state: {},
          params: {
            adHocRuleRunParamsId: backfillRun.id,
            spaceId: backfillRun.attributes.spaceId,
          },
        });
      } else {
        this.logger.info(`No backfills queued`);
      }
    } catch (error) {
      this.logger.warn(`Error running backfill check task: ${error}`);
    }
  };
}
