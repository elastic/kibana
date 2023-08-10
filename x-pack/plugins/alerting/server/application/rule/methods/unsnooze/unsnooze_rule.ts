/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RawRule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../../../../saved_objects';
import { RulesClientContext } from '../../../../rules_client/types';
import { getUnsnoozeAttributes } from '../../../../rules_client/common';
import { updateMeta } from '../../../../rules_client/lib';

export interface UnsnoozeParams {
  id: string;
  scheduleIds?: string[];
}

export async function unsnoozeRule(
  context: RulesClientContext,
  { id, scheduleIds }: UnsnoozeParams
): Promise<void> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.unsnooze('${id}')`,
    async () => await unsnoozeWithOCC(context, { id, scheduleIds })
  );
}

async function unsnoozeWithOCC(context: RulesClientContext, { id, scheduleIds }: UnsnoozeParams) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    'alert',
    id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Unsnooze,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNSNOOZE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNSNOOZE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);
  const newAttrs = getUnsnoozeAttributes(attributes, scheduleIds);

  const updateAttributes = updateMeta(context, {
    ...newAttrs,
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
