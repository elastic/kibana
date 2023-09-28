/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { bulkUntrackParamsSchema } from './schemas';
import type { BulkUntrackParams } from './types';
import { Rule } from '../../../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';
import { untrackRuleAlerts } from '../../../../rules_client/lib';

export type { BulkUntrackParams };

export async function bulkUntrackAlerts(
  context: RulesClientContext,
  params: BulkUntrackParams
): Promise<void> {
  try {
    bulkUntrackParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.bulkUntrack('${params.ruleId}')`,
    async () => await bulkUntrackAlertsWithOCC(context, params)
  );
}

async function bulkUntrackAlertsWithOCC(
  context: RulesClientContext,
  { ruleId, alertIds }: BulkUntrackParams
) {
  const { attributes } = await context.unsecuredSavedObjectsClient.get<Rule>('alert', ruleId);

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.MuteAlert,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNTRACK_ALERT,
        savedObject: { type: 'alert', id: ruleId },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UNTRACK_ALERT,
      outcome: 'unknown',
      savedObject: { type: 'alert', id: ruleId },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  await untrackRuleAlerts(context, ruleId, attributes, alertIds);
}
