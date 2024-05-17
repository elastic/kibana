/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingAuthorizationEntity, WriteOperations } from '../../authorization';
import { RuleAttributes } from '../../data/rule/types';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { RULE_SAVED_OBJECT_TYPE, partiallyUpdateRule } from '../../saved_objects';
import { RawRule } from '../../types';
import { clearUnscheduledSnoozeAttributes } from '../common';
import { RuleAuditAction, ruleAuditEvent } from '../common/audit_events';
import { updateMetaAttributes } from '../lib';
import { RulesClientContext } from '../types';

export async function muteAll(context: RulesClientContext, { id }: { id: string }): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteAll('${id}')`,
    async () => await muteAllWithOCC(context, { id })
  );
}

async function muteAllWithOCC(context: RulesClientContext, { id }: { id: string }) {
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
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const updateAttributes = updateMetaAttributes(context, {
    muteAll: true,
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
