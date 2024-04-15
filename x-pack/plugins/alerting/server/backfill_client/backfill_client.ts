/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
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
import { AdHocRunAuditAction, adHocRunAuditEvent } from '../rules_client/common/audit_events';
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
  auditLogger?: AuditLogger;
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
    auditLogger,
    params,
    rules,
    ruleTypeRegistry,
    spaceId,
    unsecuredSavedObjectsClient,
  }: BulkQueueOpts): Promise<ScheduleBackfillResults> {
    const adHocSOsToCreate: Array<SavedObjectsBulkCreateObject<AdHocRunSO>> = [];

    /**
     * soToCreateIndexOrErrorMap contains a map of the original request index to the
     * AdHocRunSO to create index in the adHocSOsToCreate array or any errors
     * encountered while processing the request
     *
     * For example, if the original request has 5 entries, 2 of which result in errors,
     * the map will look like:
     *
     * params: [request1, request2, request3, request4, request5]
     * adHocSOsToCreate: [AdHocRunSO1, AdHocRunSO3, AdHocRunSO4]
     * soToCreateIndexOrErrorMap: {
     *   0: 0,
     *   1: error1,
     *   2: 1,
     *   3: 2,
     *   4: error2
     * }
     *
     * This allows us to return a response in the same order the requests were received
     */

    const soToCreateIndexOrErrorMap: Map<number, number | ScheduleBackfillError> = new Map();

    params.forEach((param: ScheduleBackfillParam, ndx: number) => {
      // For this schedule request, look up the rule or return error
      const { rule, error } = getRuleOrError(param.ruleId, rules, ruleTypeRegistry);
      if (rule) {
        // keep track of index of this request in the adHocSOsToCreate array
        soToCreateIndexOrErrorMap.set(ndx, adHocSOsToCreate.length);
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
        // keep track of the error encountered for this request by index so
        // we can return it in order
        soToCreateIndexOrErrorMap.set(ndx, error);
        this.logger.warn(
          `No rule found for ruleId ${param.ruleId} - not scheduling backfill for ${JSON.stringify(
            param
          )}`
        );
      }
    });

    // Every request encountered an error, so short-circuit the logic here
    if (!adHocSOsToCreate.length) {
      return params.map(
        (_, ndx: number) => soToCreateIndexOrErrorMap.get(ndx) as ScheduleBackfillError
      );
    }

    // Bulk create the saved object
    const bulkCreateResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRunSO>(
      adHocSOsToCreate
    );

    const transformedResponse: ScheduleBackfillResults = bulkCreateResponse.saved_objects.map(
      (so: SavedObject<AdHocRunSO>) => {
        if (so.error) {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              error: new Error(so.error.message),
            })
          );
        } else {
          auditLogger?.log(
            adHocRunAuditEvent({
              action: AdHocRunAuditAction.CREATE,
              savedObject: { type: AD_HOC_RUN_SAVED_OBJECT_TYPE, id: so.id },
            })
          );
        }
        return transformAdHocRunToBackfillResult(so);
      }
    );

    /**
     * Use soToCreateIndexOrErrorMap to build the result array that returns
     * the bulkQueue result in the same order of the request
     *
     * For example, if we have 3 entries in the bulkCreateResponse
     *
     * bulkCreateResult: [AdHocRunSO1, AdHocRunSO3, AdHocRunSO4]
     * soToCreateIndexOrErrorMap: {
     *   0: 0,
     *   1: error1,
     *   2: 1,
     *   3: 2,
     *   4: error2
     * }
     *
     * The following result would be returned
     * result: [AdHocRunSO1, error1, AdHocRunSO3, AdHocRunSO4, error2]
     */
    const createSOResult = Array.from(soToCreateIndexOrErrorMap.keys()).map((ndx: number) => {
      const indexOrError = soToCreateIndexOrErrorMap.get(ndx);

      if (isNumber(indexOrError)) {
        // This number is the index of the response from the savedObjects bulkCreate function
        return transformedResponse[indexOrError];
      } else {
        // Return the error we encountered
        return indexOrError as ScheduleBackfillError;
      }
    });

    // Build array of tasks to schedule
    const adHocTasksToSchedule: TaskInstance[] = [];
    createSOResult.forEach((result: ScheduleBackfillResult) => {
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
