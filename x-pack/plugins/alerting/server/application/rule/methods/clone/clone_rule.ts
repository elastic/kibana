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
import { SanitizedRule, RawRule } from '../../../../types';
import { getDefaultMonitoring } from '../../../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { parseDuration } from '../../../../../common/parse_duration';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { getRuleExecutionStatusPendingAttributes } from '../../../../lib/rule_execution_status';
import { isDetectionEngineAADRuleType } from '../../../../saved_objects/migrations/utils';
import { createNewAPIKeySet, createRuleSavedObject } from '../../../../rules_client/lib';
import { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { CloneRuleParams } from './types';
import { RuleAttributes } from '../../../../data/rule/types';
import { RuleDomain, RuleParams } from '../../types';
import { getDecryptedRuleSo, getRuleSo } from '../../../../data/rule';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import { ruleDomainSchema } from '../../schemas';
import { cloneRuleParamsSchema } from './schemas';

export async function cloneRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: CloneRuleParams
): Promise<SanitizedRule<Params>> {
  const { id, newId } = params;

  try {
    cloneRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating clone data - ${error.message}`);
  }

  let ruleSavedObject: SavedObject<RuleAttributes>;

  try {
    ruleSavedObject = await withSpan(
      { name: 'encryptedSavedObjectsClient.getDecryptedAsInternalUser', type: 'rules' },
      () => {
        return getDecryptedRuleSo({
          id,
          encryptedSavedObjectsClient: context.encryptedSavedObjectsClient,
          savedObjectsGetOptions: {
            namespace: context.namespace,
          },
        });
      }
    );
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the object using SOC
    ruleSavedObject = await withSpan(
      { name: 'unsecuredSavedObjectsClient.get', type: 'rules' },
      () => {
        return getRuleSo({
          id,
          savedObjectsClient: context.unsecuredSavedObjectsClient,
        });
      }
    );
  }

  /*
   * As the time of the creation of this PR, security solution already have a clone/duplicate API
   * with some specific business logic so to avoid weird bugs, I prefer to exclude them from this
   * functionality until we resolve our difference
   */
  if (
    // TODO (http-versioning): Remove this cast to RawRule
    isDetectionEngineAADRuleType(ruleSavedObject as SavedObject<RawRule>) ||
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
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
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
  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: ruleType.id,
    ruleName,
    username,
    shouldUpdateApiKey: ruleSavedObject.attributes.enabled,
    errorMessage: 'Error creating rule: could not create API key',
  });

  const ruleAttributes: RuleAttributes = {
    ...ruleSavedObject.attributes,
    name: ruleName,
    ...apiKeyAttributes,
    legacyId,
    createdBy: username,
    updatedBy: username,
    createdAt: new Date(createTime).toISOString(),
    updatedAt: new Date(createTime).toISOString(),
    snoozeSchedule: [],
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: getRuleExecutionStatusPendingAttributes(lastRunTimestamp.toISOString()),
    // TODO (http-versioning): Remove this cast to RuleAttributes
    monitoring: getDefaultMonitoring(
      lastRunTimestamp.toISOString()
    ) as RuleAttributes['monitoring'],
    revision: 0,
    scheduledTaskId: null,
    running: false,
  };

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.CREATE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  const clonedRuleAttributes = await withSpan(
    { name: 'createRuleSavedObject', type: 'rules' },
    () =>
      createRuleSavedObject(context, {
        intervalInMs: parseDuration(ruleAttributes.schedule.interval),
        rawRule: ruleAttributes,
        references: ruleSavedObject.references,
        ruleId,
        returnRuleAttributes: true,
      })
  );

  // Convert ES RuleAttributes back to domain rule object
  const ruleDomain: RuleDomain<Params> = transformRuleAttributesToRuleDomain<Params>(
    clonedRuleAttributes.attributes,
    {
      id: clonedRuleAttributes.id,
      logger: context.logger,
      ruleType: context.ruleTypeRegistry.get(clonedRuleAttributes.attributes.alertTypeId),
      references: clonedRuleAttributes.references,
    },
    (connectorId: string) => context.isSystemAction(connectorId)
  );

  // Try to validate created rule, but don't throw.
  try {
    ruleDomainSchema.validate(ruleDomain);
  } catch (e) {
    context.logger.warn(`Error validating clone rule domain object for id: ${id}, ${e}`);
  }

  // Convert domain rule to rule (Remove certain properties)
  const rule = transformRuleDomainToRule<Params>(ruleDomain, { isPublic: false });

  // TODO (http-versioning): Remove this cast, this enables us to move forward
  // without fixing all of other solution types
  return rule as SanitizedRule<Params>;
}
