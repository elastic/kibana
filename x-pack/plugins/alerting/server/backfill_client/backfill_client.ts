/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectReference,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  RunContext,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskPriority,
} from '@kbn/task-manager-plugin/server';
import { isNumber } from 'lodash';
import {
  ScheduleBackfillError,
  ScheduleBackfillParam,
  ScheduleBackfillParams,
  ScheduleBackfillResult,
  ScheduleBackfillResults,
} from '../application/backfill/methods/schedule/types';
import { Backfill } from '../application/backfill/result/types';
import {
  transformBackfillParamToAdHocRun,
  transformAdHocRunToBackfillResult,
} from '../application/backfill/transforms';
import { RuleDomain } from '../application/rule/types';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { TaskRunnerFactory } from '../task_runner';
import { RuleTypeRegistry } from '../types';
import { createBackfillError } from './lib';

export const BACKFILL_TASK_TYPE = 'ad_hoc_run-backfill';

interface ConstructorOpts {
  logger: Logger;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
  taskRunnerFactory: TaskRunnerFactory;
}

interface BulkQueueOpts {
  params: ScheduleBackfillParams;
  rules: RuleDomain[];
  ruleTypeRegistry: RuleTypeRegistry;
  spaceId: string;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export class BackfillClient {
  private logger: Logger;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.taskManagerStartPromise = opts.taskManagerStartPromise;

    // Registers the task that handles the backfill using the ad hoc task runner
    opts.taskManagerSetup.registerTaskDefinitions({
      [BACKFILL_TASK_TYPE]: {
        title: 'Alerting Backfill Rule Run',
        priority: TaskPriority.Low,
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  public async bulkQueue({
    params,
    rules,
    ruleTypeRegistry,
    spaceId,
    unsecuredSavedObjectsClient,
  }: BulkQueueOpts): Promise<ScheduleBackfillResults> {
    const adHocSOsToCreate: Array<SavedObjectsBulkCreateObject<AdHocRunSO>> = [];
    const soToCreateOrErrorMap: Map<number, number | ScheduleBackfillError> = new Map();

    params.forEach((param: ScheduleBackfillParam, ndx: number) => {
      const { rule, error } = getRuleOrError(param.ruleId, rules, ruleTypeRegistry);
      if (rule) {
        soToCreateOrErrorMap.set(ndx, adHocSOsToCreate.length);
        const reference: SavedObjectReference = {
          id: rule.id,
          name: `rule`,
          type: RULE_SAVED_OBJECT_TYPE,
        };
        adHocSOsToCreate.push({
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: transformBackfillParamToAdHocRun(param, rule, spaceId),
          references: [reference],
        });
      } else if (error) {
        soToCreateOrErrorMap.set(ndx, error);
        this.logger.warn(
          `No rule found for ruleId ${param.ruleId} - not scheduling backfill for ${JSON.stringify(
            param
          )}`
        );
      }
    });

    if (!adHocSOsToCreate.length) {
      return params.map((_, ndx: number) => soToCreateOrErrorMap.get(ndx) as ScheduleBackfillError);
    }

    const bulkCreateResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRunSO>(
      adHocSOsToCreate
    );

    const transformedResponse: ScheduleBackfillResults = bulkCreateResponse.saved_objects.map(
      transformAdHocRunToBackfillResult
    );

    const createSOResult = Array.from(soToCreateOrErrorMap.keys()).map((ndx: number) => {
      const indexOrError = soToCreateOrErrorMap.get(ndx);
      if (isNumber(indexOrError)) {
        return transformedResponse[indexOrError as number];
      } else {
        return indexOrError as ScheduleBackfillError;
      }
    });

    // Build array of tasks to schedule
    const adHocTasksToSchedule: TaskInstance[] = [];
    createSOResult.forEach((result: ScheduleBackfillResult, ndx: number) => {
      if (!(result as ScheduleBackfillError).error) {
        const createdSO = result as Backfill;

        const ruleTypeTimeout = ruleTypeRegistry.get(createdSO.rule.alertTypeId).ruleTaskTimeout;
        adHocTasksToSchedule.push({
          id: createdSO.id,
          taskType: BACKFILL_TASK_TYPE,
          ...(ruleTypeTimeout ? { timeoutOverride: ruleTypeTimeout } : {}),
          state: {},
          params: {
            adHocRunParamsId: createdSO.id,
            spaceId,
          },
        });
      }
    });

    if (adHocTasksToSchedule.length > 0) {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.bulkSchedule(adHocTasksToSchedule);
    }

    return createSOResult;
  }
}

function getRuleOrError(
  ruleId: string,
  rules: RuleDomain[],
  ruleTypeRegistry: RuleTypeRegistry
): { rule?: RuleDomain; error?: ScheduleBackfillError } {
  const rule = rules.find((r: RuleDomain) => r.id === ruleId);

  // if rule not found, return not found error
  if (!rule) {
    const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
      RULE_SAVED_OBJECT_TYPE,
      ruleId
    );
    return {
      error: createBackfillError(
        notFoundError.output.payload.error,
        notFoundError.output.payload.message
      ),
    };
  }

  // if rule exists, check that it is enabled
  if (!rule.enabled) {
    return { error: createBackfillError('Bad Request', `Rule ${ruleId} is disabled`) };
  }

  // check that the rule type is supported
  const isLifecycleRule = ruleTypeRegistry.get(rule.alertTypeId).autoRecoverAlerts ?? true;
  if (isLifecycleRule) {
    return {
      error: createBackfillError(
        'Bad Request',
        `Rule type "${rule.alertTypeId}" for rule ${ruleId} is not supported`
      ),
    };
  }

  // check that the API key is not null
  if (!rule.apiKey) {
    return {
      error: createBackfillError('Bad Request', `Rule ${ruleId} has no API key`),
    };
  }

  return { rule };
}
