/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { bulkUntrackBodySchema } from './schemas';
import type { BulkUntrackBody } from './types';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';

export type { BulkUntrackBody };

export async function bulkUntrackAlerts(
  context: RulesClientContext,
  params: BulkUntrackBody
): Promise<void> {
  try {
    bulkUntrackBodySchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Failed to validate params: ${error.message}`);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.bulkUntrack('${params.alertUuids}')`,
    async () => await bulkUntrackAlertsWithOCC(context, params)
  );
}

async function bulkUntrackAlertsWithOCC(
  context: RulesClientContext,
  { indices, alertUuids }: BulkUntrackBody
) {
  try {
    if (!context.alertsService) throw new Error('unable to access alertsService');
    await context.alertsService.setAlertsToUntracked({ indices, alertUuids });
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNTRACK_ALERT,
        outcome: 'success',
      })
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNTRACK_ALERT,
        error,
      })
    );
    throw error;
  }
}
