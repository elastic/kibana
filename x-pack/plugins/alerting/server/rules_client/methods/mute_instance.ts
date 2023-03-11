/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { MuteOptions } from '../types';
import { RulesClientContext } from '../types';
import { updateMeta } from '../lib';

export async function muteInstance(
  context: RulesClientContext,
  { alertId, alertInstanceId }: MuteOptions
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.muteInstance('${alertId}')`,
    async () => await muteInstanceWithOCC(context, { alertId, alertInstanceId })
  );
}

async function muteInstanceWithOCC(
  context: RulesClientContext,
  { alertId, alertInstanceId }: MuteOptions
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    'alert',
    alertId
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE_ALERT,
        savedObject: { type: 'alert', id: alertId },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.MUTE_ALERT,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: alertId },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
    mutedInstanceIds.push(alertInstanceId);
    await context.unsecuredSavedObjectsClient.update(
      'alert',
      alertId,
      updateMeta(context, {
        mutedInstanceIds,
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
      }),
      { version }
    );
  }
}
