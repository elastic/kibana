/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { updateMeta } from '../lib';
import { clearUnscheduledSnooze } from '../common';

export async function unmuteAll(
  context: RulesClientContext,
  { id }: { id: string }
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteAll('${id}')`,
    async () => await unmuteAllWithOCC(context, { id })
  );
}

async function unmuteAllWithOCC(context: RulesClientContext, { id }: { id: string }) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    'alert',
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
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNMUTE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const updateAttributes = updateMeta(context, {
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: clearUnscheduledSnooze(attributes),
    updatedBy: await context.getUserName(),
    updatedAt: new Date().toISOString(),
  });
  const updateOptions = { version };

  await partiallyUpdateAlert(
    context.unsecuredSavedObjectsClient,
    id,
    updateAttributes,
    updateOptions
  );
}
