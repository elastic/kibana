/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Semver from 'semver';
import Boom from '@hapi/boom';
import { SavedObject, SavedObjectsUtils } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { parseDuration } from '../../../common/parse_duration';
import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { validateRuleTypeParams, getRuleNotifyWhenType, getDefaultMonitoring } from '../../lib';
import { getRuleExecutionStatusPending } from '../../lib/rule_execution_status';
import {
  createRuleSavedObject,
  extractReferences,
  validateActions,
  addGeneratedActionValues,
  transformRuleToEs,
  transformEsToRule,
  transformRuleToPublicRule,
} from '../lib';
import { generateAPIKeyName, apiKeyAsAlertAttributes } from '../common';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { Rule, RuleParams, SanitizedRule, NormalizedAction } from '../../../common/types/api';
import { RuleAttributes } from '../../common/types';

export interface CreateRuleData {
  name: Rule['name'];
  alertTypeId: Rule['alertTypeId'];
  enabled: Rule['enabled'];
  consumer: Rule['consumer'];
  tags: Rule['tags'];
  throttle?: Rule['throttle'];
  params: RuleParams;
  schedule: Rule['schedule'];
  actions: NormalizedAction[];
  notifyWhen: Rule['notifyWhen'];
}

export interface CreateRuleOptions {
  id?: string;
}

export interface CreateParams {
  data: CreateRuleData;
  options?: CreateRuleOptions;
  allowMissingConnectorSecrets?: boolean;
}

export async function create<Params extends RuleParams = never>(
  context: RulesClientContext,
  createParams: CreateParams
): Promise<SanitizedRule<Params>> {
  const { data: initialData, options, allowMissingConnectorSecrets } = createParams;

  const data = { ...initialData, actions: addGeneratedActionValues(initialData.actions) };

  const id = options?.id || SavedObjectsUtils.generateId();

  try {
    await withSpan({ name: 'authorization.ensureAuthorized', type: 'rules' }, () =>
      context.authorization.ensureAuthorized({
        ruleTypeId: data.alertTypeId,
        consumer: data.consumer,
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      })
    );
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

  const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  const username = await context.getUserName();

  let createdAPIKey = null;
  let isAuthTypeApiKey = false;
  try {
    isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
    const name = generateAPIKeyName(ruleType.id, data.name);
    createdAPIKey = data.enabled
      ? isAuthTypeApiKey
        ? context.getAuthenticationAPIKey(`${name}-user-created`)
        : await withSpan(
            {
              name: 'createAPIKey',
              type: 'rules',
            },
            () => context.createAPIKey(name)
          )
      : null;
  } catch (error) {
    throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
  }

  await withSpan({ name: 'validateActions', type: 'rules' }, () =>
    validateActions(context, ruleType, data, allowMissingConnectorSecrets)
  );

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
  } = await withSpan({ name: 'extractReferences', type: 'rules' }, () =>
    extractReferences(context, ruleType, data.actions, validatedAlertTypeParams)
  );

  const createTime = Date.now();
  const lastRunTimestamp = new Date();
  const legacyId = Semver.lt(context.kibanaVersion, '8.0.0') ? id : null;
  const notifyWhen = getRuleNotifyWhenType(data.notifyWhen ?? null, data.throttle ?? null);
  const throttle = data.throttle ?? null;

  // Convert domain rule object to ES rule attributes
  const esRule = transformRuleToEs(
    {
      ...data,
      ...apiKeyAsAlertAttributes(createdAPIKey, username, isAuthTypeApiKey),
      id,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
      snoozeSchedule: [],
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen,
      throttle,
      executionStatus: getRuleExecutionStatusPending(
        lastRunTimestamp.toISOString()
      ) as Rule['executionStatus'],
      monitoring: getDefaultMonitoring(lastRunTimestamp.toISOString()) as Rule['monitoring'],
      revision: 0,
      running: false,
    },
    {
      legacyId,
      actionsWithRefs: actions as RuleAttributes['actions'],
      paramsWithRefs: updatedParams,
    }
  );

  // Save the rule with the es attributes, returns a RawRule, this should be RulesAttribute
  // but I'm holding off changing it to that for now since we need to change a lot of
  // references to RawRule
  const createdRuleSavedObject: SavedObject<RawRule> = await withSpan(
    { name: 'createRuleSavedObject', type: 'rules' },
    () =>
      createRuleSavedObject(context, {
        intervalInMs,
        rawRule: esRule as RawRule,
        references,
        ruleId: id,
        options,
      })
  );

  // Convert ES RuleAttributes back to domain rule object
  const rule: Rule<Params> = transformEsToRule<Params>(
    createdRuleSavedObject.attributes as RuleAttributes,
    {
      id: createdRuleSavedObject.id,
      logger: context.logger,
      ruleType: context.ruleTypeRegistry.get(createdRuleSavedObject.attributes.alertTypeId),
      references,
    }
  );

  // Convert rule to public rule (Remove certain properties)
  return transformRuleToPublicRule<Params>(rule);
}
