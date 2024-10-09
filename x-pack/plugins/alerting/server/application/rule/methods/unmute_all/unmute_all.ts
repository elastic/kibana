/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RawRule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { partiallyUpdateRule, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';
import { updateMetaAttributes } from '../../../../rules_client/lib';
import { clearUnscheduledSnoozeAttributes } from '../../../../rules_client/common';
import { RuleAttributes } from '../../../../data/rule/types';
import { UnmuteAllRuleParams } from './types';
import { unmuteAllRuleParamsSchema } from './schemas';

export async function unmuteAll(
  context: RulesClientContext,
  { id }: UnmuteAllRuleParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteAll('${id}')`,
    async () => await unmuteAllWithOCC(context, { id })
  );
}

async function unmuteAllWithOCC(context: RulesClientContext, params: UnmuteAllRuleParams) {
  try {
    unmuteAllRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating unmute all parameters - ${error.message}`);
  }

  const { id } = params;
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UnmuteAll,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNMUTE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const updateAttributes = updateMetaAttributes(context, {
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: clearUnscheduledSnoozeAttributes(attributes as RuleAttributes),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });
  const updateOptions = { version };

  await partiallyUpdateRule(
    context.unsecuredSavedObjectsClient,
    id,
    updateAttributes,
    updateOptions
  );
}
