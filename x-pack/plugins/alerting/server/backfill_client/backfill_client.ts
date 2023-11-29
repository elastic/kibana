/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskPriority,
} from '@kbn/task-manager-plugin/server';
import type {
  ScheduleBackfillOptions,
  ScheduleBackfillResults,
} from '../application/rule/methods/backfill/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { AlertingPluginsStart } from '../plugin';
import { TaskRunnerFactory } from '../task_runner';
import { AdHocRuleRunParams, RuleTypeRegistry } from '../types';

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
  ruleTypeRegistry: RuleTypeRegistry;
  options: ScheduleBackfillOptions;
}

export class BackfillClient {
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  private readonly backfillTaskType = 'Backfill';

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.coreStartServices = opts.coreStartServices;

    // Registers the task that handles the backfill using the ad hoc task runner
    opts.taskManager.registerTaskDefinitions({
      [this.backfillTaskType]: {
        title: 'Alerting Backfill',
        priority: TaskPriority.Low,
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  public async bulkQueue({
    unsecuredSavedObjectsClient,
    rules,
    spaceId,
    options,
    ruleTypeRegistry,
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

    // Bulk schedule the backfill
    const taskManager = await this.getTaskManager();
    await taskManager.bulkSchedule(
      bulkResponse.saved_objects
        .filter((so) => !so.error)
        .map((so) => {
          const ruleTypeTimeout = ruleTypeRegistry.get(
            so.attributes.rule.alertTypeId
          ).ruleTaskTimeout;
          return {
            id: so.id,
            taskType: this.backfillTaskType,
            ...(ruleTypeTimeout ? { timeoutOverride: ruleTypeTimeout } : {}),
            state: {},
            params: {
              adHocRuleRunParamsId: so.id,
              spaceId,
            },
          };
        })
    );
    // TODO retry errors
    return bulkResponse.saved_objects.map((so, index) => ({
      ruleId: rules[index].id,
      backfillId: so.error ? null : so.id,
    }));
  }

  private async getTaskManager(): Promise<TaskManagerStartContract> {
    if (this.taskManager) {
      return this.taskManager;
    }

    const [_, alertingStart] = await this.coreStartServices;
    this.taskManager = alertingStart.taskManager;
    return this.taskManager;
  }
}
