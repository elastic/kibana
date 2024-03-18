/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, RawRule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { MuteOptions } from '../types';
import { RulesClientContext } from '../types';
import { updateMeta } from '../lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export async function unmuteInstance(
  context: RulesClientContext,
  { alertId, alertInstanceId }: MuteOptions
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unmuteInstance('${alertId}')`,
    async () => await unmuteInstanceWithOCC(context, { alertId, alertInstanceId })
  );
}

async function unmuteInstanceWithOCC(
  context: RulesClientContext,
  {
    alertId,
    alertInstanceId,
  }: {
    alertId: string;
    alertInstanceId: string;
  }
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<Rule>(
    RULE_SAVED_OBJECT_TYPE,
    alertId
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.UnmuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });
    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE_ALERT,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: alertId },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNMUTE_ALERT,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: alertId },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const mutedInstanceIds = attributes.mutedInstanceIds || [];
  if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
    await context.unsecuredSavedObjectsClient.update<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      alertId,
      updateMeta(context, {
        updatedBy: await context.getUserName(),
        updatedAt: new Date().toISOString(),
        mutedInstanceIds: mutedInstanceIds.filter((id: string) => id !== alertInstanceId),
      }),
      { version }
    );
  }
}
