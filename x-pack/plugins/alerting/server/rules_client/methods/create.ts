/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Semver from 'semver';
import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import { parseDuration } from '../../../common/parse_duration';
import { RawRule, SanitizedRule, RuleTypeParams, RuleAction, Rule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { validateRuleTypeParams, getRuleNotifyWhenType, getDefaultMonitoring } from '../../lib';
import { getRuleExecutionStatusPending } from '../../lib/rule_execution_status';
import { createRuleSavedObject, extractReferences, validateActions } from '../lib';
import { generateAPIKeyName, getMappedParams, apiKeyAsAlertAttributes } from '../common';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';

type NormalizedAlertAction = Omit<RuleAction, 'actionTypeId'>;
interface SavedObjectOptions {
  id?: string;
  migrationVersion?: Record<string, string>;
}

export interface CreateOptions<Params extends RuleTypeParams> {
  data: Omit<
    Rule<Params>,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
    | 'executionStatus'
    | 'snoozeSchedule'
    | 'isSnoozedUntil'
    | 'lastRun'
    | 'nextRun'
  > & { actions: NormalizedAlertAction[] };
  options?: SavedObjectOptions;
}

export async function create<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  { data, options }: CreateOptions<Params>
): Promise<SanitizedRule<Params>> {
  const id = options?.id || SavedObjectsUtils.generateId();

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: data.alertTypeId,
      consumer: data.consumer,
      operation: WriteOperations.Create,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

  // Throws an error if alert type isn't registered
  const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);

  const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate?.params);
  const username = await context.getUserName();

  let createdAPIKey = null;
  try {
    createdAPIKey = data.enabled
      ? await context.createAPIKey(generateAPIKeyName(ruleType.id, data.name))
      : null;
  } catch (error) {
    throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
  }

  await validateActions(context, ruleType, data);

  // Throw error if schedule interval is less than the minimum and we are enforcing it
  const intervalInMs = parseDuration(data.schedule.interval);
  if (
    intervalInMs < context.minimumScheduleIntervalInMs &&
    context.minimumScheduleInterval.enforce
  ) {
    throw Boom.badRequest(
      `Error creating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
    );
  }

  // Extract saved object references for this rule
  const {
    references,
    params: updatedParams,
    actions,
  } = await extractReferences(context, ruleType, data.actions, validatedAlertTypeParams);

  const createTime = Date.now();
  const lastRunTimestamp = new Date();
  const legacyId = Semver.lt(context.kibanaVersion, '8.0.0') ? id : null;
  const notifyWhen = getRuleNotifyWhenType(data.notifyWhen ?? null, data.throttle ?? null);
  const throttle = data.throttle ?? null;

  const rawRule: RawRule = {
    ...data,
    ...apiKeyAsAlertAttributes(createdAPIKey, username),
    legacyId,
    actions,
    createdBy: username,
    updatedBy: username,
    createdAt: new Date(createTime).toISOString(),
    updatedAt: new Date(createTime).toISOString(),
    snoozeSchedule: [],
    params: updatedParams as RawRule['params'],
    muteAll: false,
    mutedInstanceIds: [],
    notifyWhen,
    throttle,
    executionStatus: getRuleExecutionStatusPending(lastRunTimestamp.toISOString()),
    monitoring: getDefaultMonitoring(lastRunTimestamp.toISOString()),
  };

  const mappedParams = getMappedParams(updatedParams);

  if (Object.keys(mappedParams).length) {
    rawRule.mapped_params = mappedParams;
  }

  return await createRuleSavedObject(context, {
    intervalInMs,
    rawRule,
    references,
    ruleId: id,
    options,
  });
}
