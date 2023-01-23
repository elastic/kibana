/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';
import Boom from '@hapi/boom';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { SavedObject, SavedObjectsUtils } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { RawRule, SanitizedRule, RuleTypeParams } from '../../types';
import { getDefaultMonitoring } from '../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { parseDuration } from '../../../common/parse_duration';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getRuleExecutionStatusPending } from '../../lib/rule_execution_status';
import { isDetectionEngineAADRuleType } from '../../saved_objects/migrations/utils';
import { generateAPIKeyName, apiKeyAsAlertAttributes } from '../common';
import { createRuleSavedObject } from '../lib';
import { RulesClientContext } from '../types';

export type CloneArguments = [string, { newId?: string }];

export async function clone<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  id: string,
  { newId }: { newId?: string }
): Promise<SanitizedRule<Params>> {
  let ruleSavedObject: SavedObject<RawRule>;

  try {
    ruleSavedObject = await withSpan(
      { name: 'encryptedSavedObjectsClient.getDecryptedAsInternalUser', type: 'rules' },
      () =>
        context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
          namespace: context.namespace,
        })
    );
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the object using SOC
    ruleSavedObject = await withSpan(
      { name: 'unsecuredSavedObjectsClient.get', type: 'rules' },
      () => context.unsecuredSavedObjectsClient.get<RawRule>('alert', id)
    );
  }

  /*
   * As the time of the creation of this PR, security solution already have a clone/duplicate API
   * with some specific business logic so to avoid weird bugs, I prefer to exclude them from this
   * functionality until we resolve our difference
   */
  if (
    isDetectionEngineAADRuleType(ruleSavedObject) ||
    ruleSavedObject.attributes.consumer === AlertConsumers.SIEM
  ) {
    throw Boom.badRequest(
      'The clone functionality is not enable for rule who belongs to security solution'
    );
  }
  const ruleName =
    ruleSavedObject.attributes.name.indexOf('[Clone]') > 0
      ? ruleSavedObject.attributes.name
      : `${ruleSavedObject.attributes.name} [Clone]`;
  const ruleId = newId ?? SavedObjectsUtils.generateId();
  try {
    await withSpan({ name: 'authorization.ensureAuthorized', type: 'rules' }, () =>
      context.authorization.ensureAuthorized({
        ruleTypeId: ruleSavedObject.attributes.alertTypeId,
        consumer: ruleSavedObject.attributes.consumer,
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

  context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleSavedObject.attributes.alertTypeId);
  // Throws an error if alert type isn't registered
  const ruleType = context.ruleTypeRegistry.get(ruleSavedObject.attributes.alertTypeId);
  const username = await context.getUserName();
  const createTime = Date.now();
  const lastRunTimestamp = new Date();
  const legacyId = Semver.lt(context.kibanaVersion, '8.0.0') ? id : null;
  let createdAPIKey = null;
  try {
    createdAPIKey = ruleSavedObject.attributes.enabled
      ? await context.createAPIKey(generateAPIKeyName(ruleType.id, ruleName))
      : null;
  } catch (error) {
    throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
  }
  const rawRule: RawRule = {
    ...ruleSavedObject.attributes,
    name: ruleName,
    ...apiKeyAsAlertAttributes(createdAPIKey, username),
    legacyId,
    createdBy: username,
    updatedBy: username,
    createdAt: new Date(createTime).toISOString(),
    updatedAt: new Date(createTime).toISOString(),
    snoozeSchedule: [],
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: getRuleExecutionStatusPending(lastRunTimestamp.toISOString()),
    monitoring: getDefaultMonitoring(lastRunTimestamp.toISOString()),
    revision: 0, // TODO: Clarify if we're resetting revision since it's a new rule, or carrying over from previous rule (existing security solution behavior)
    scheduledTaskId: null,
    running: false,
  };

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.CREATE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  return await withSpan({ name: 'createRuleSavedObject', type: 'rules' }, () =>
    createRuleSavedObject(context, {
      intervalInMs: parseDuration(rawRule.schedule.interval),
      rawRule,
      references: ruleSavedObject.references,
      ruleId,
    })
  );
}
