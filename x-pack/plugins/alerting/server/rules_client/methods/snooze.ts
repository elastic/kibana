/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { RawRule, RuleSnoozeSchedule } from '../../types';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../../saved_objects';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { validateSnoozeStartDate } from '../../lib/validate_snooze_date';
import { RuleMutedError } from '../../lib/errors/rule_muted';
import { RulesClientContext } from '../types';
import { getSnoozeAttributes, verifySnoozeScheduleLimit } from '../common';
import { updateMeta } from '../lib';

export interface SnoozeParams {
  id: string;
  snoozeSchedule: RuleSnoozeSchedule;
}

export async function snooze(
  context: RulesClientContext,
  { id, snoozeSchedule }: SnoozeParams
): Promise<void> {
  const snoozeDateValidationMsg = validateSnoozeStartDate(snoozeSchedule.rRule.dtstart);
  if (snoozeDateValidationMsg) {
    throw new RuleMutedError(snoozeDateValidationMsg);
  }

  return await retryIfConflicts(
    context.logger,
    `rulesClient.snooze('${id}', ${JSON.stringify(snoozeSchedule, null, 4)})`,
    async () => await snoozeWithOCC(context, { id, snoozeSchedule })
  );
}

async function snoozeWithOCC(
  context: RulesClientContext,
  {
    id,
    snoozeSchedule,
  }: {
    id: string;
    snoozeSchedule: RuleSnoozeSchedule;
  }
) {
  const { attributes, version } = await context.unsecuredSavedObjectsClient.get<RawRule>(
    'alert',
    id
  );

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: attributes.alertTypeId,
      consumer: attributes.consumer,
      operation: WriteOperations.Snooze,
      entity: AlertingAuthorizationEntity.Rule,
    });

    if (attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SNOOZE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.SNOOZE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

  const newAttrs = getSnoozeAttributes(attributes, snoozeSchedule);

  try {
    verifySnoozeScheduleLimit(newAttrs);
  } catch (error) {
    throw Boom.badRequest(error.message);
  }

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
