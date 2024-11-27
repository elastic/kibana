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
import { MuteAllRuleParams } from './types';
import { muteAllRuleParamsSchema } from './schemas';

export async function muteAll(
  context: RulesClientContext,
  { id }: MuteAllRuleParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteAll('${id}')`,
    async () => await muteAllWithOCC(context, { id })
  );
}

async function muteAllWithOCC(context: RulesClientContext, params: MuteAllRuleParams) {
  try {
    muteAllRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating mute all parameters - ${error.message}`);
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
      operation: WriteOperations.MuteAll,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: attributes.name },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const updateAttributes = updateMetaAttributes(context, {
    muteAll: true,
    mutedInstanceIds: [],
    snoozeSchedule: clearUnscheduledSnoozeAttributes(attributes),
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
