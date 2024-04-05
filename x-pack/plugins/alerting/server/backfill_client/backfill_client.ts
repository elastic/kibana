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
import { isNumber } from 'lodash';
import {
  ScheduleBackfillError,
  ScheduleBackfillParam,
  ScheduleBackfillParams,
  ScheduleBackfillResults,
} from '../application/backfill/methods/schedule/types';
import {
  transformBackfillParamToAdHocRun,
  transformAdHocRunToBackfillResult,
} from '../application/backfill/transforms';
import { RuleDomain } from '../application/rule/types';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { AdHocRunAuditAction, adHocRunAuditEvent } from '../rules_client/common/audit_events';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { RuleTypeRegistry } from '../types';
import { createBackfillError } from './lib';

interface ConstructorOpts {
  logger: Logger;
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

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
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
    const resultOrErrorMap: Map<number, number | ScheduleBackfillError> = new Map();

    params.forEach((param: ScheduleBackfillParam, ndx: number) => {
      const { rule, error } = getRuleOrError(param.ruleId, rules, ruleTypeRegistry);
      if (rule) {
        resultOrErrorMap.set(ndx, adHocSOsToCreate.length);
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
        resultOrErrorMap.set(ndx, error);
        this.logger.warn(
          `No rule found for ruleId ${param.ruleId} - not scheduling backfill for ${JSON.stringify(
            param
          )}`
        );
      }
    });

    if (!adHocSOsToCreate.length) {
      return params.map((_, ndx: number) => resultOrErrorMap.get(ndx) as ScheduleBackfillError);
    }

    const bulkCreateResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRunSO>(
      adHocSOsToCreate
    );

    // TODO bulk schedule the underlying tasks
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
    return Array.from(resultOrErrorMap.keys()).map((ndx: number) => {
      const indexOrError = resultOrErrorMap.get(ndx);
      if (isNumber(indexOrError)) {
        return transformedResponse[indexOrError as number];
      } else {
        return indexOrError as ScheduleBackfillError;
      }
    });
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
